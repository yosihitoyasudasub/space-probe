import React, { useRef, useEffect } from 'react';
import { DataPoint } from '../app/page';

interface MiniChartProps {
    data: DataPoint[];
    color: string;
    label: string;
    unit: string;
    width?: number;
    height?: number;
}

const MiniChart: React.FC<MiniChartProps> = ({
    data,
    color,
    label,
    unit,
    width = 250,
    height = 80,
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || data.length < 2) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Get min/max values for scaling
        const values = data.map(d => d.value);
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const valueRange = maxValue - minValue || 1;

        const times = data.map(d => d.time);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const timeRange = maxTime - minTime || 1;

        // Draw grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (height / 4) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw the line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        data.forEach((point, index) => {
            const x = ((point.time - minTime) / timeRange) * width;
            const y = height - ((point.value - minValue) / valueRange) * height;

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });

        ctx.stroke();

        // Draw current value indicator
        if (data.length > 0) {
            const lastPoint = data[data.length - 1];
            const x = width;
            const y = height - ((lastPoint.value - minValue) / valueRange) * height;

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x - 2, y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }, [data, color, width, height]);

    // Get current, min, max values
    const currentValue = data.length > 0 ? data[data.length - 1].value : 0;
    const maxValue = data.length > 0 ? Math.max(...data.map(d => d.value)) : 0;
    const minValue = data.length > 0 ? Math.min(...data.map(d => d.value)) : 0;

    return (
        <div className="mini-chart">
            <div className="chart-header">
                <span className="chart-label">{label}</span>
                <span className="chart-current" style={{ color }}>
                    {currentValue.toFixed(2)} {unit}
                </span>
            </div>
            <canvas ref={canvasRef} width={width} height={height} />
            <div className="chart-stats">
                <span className="stat-min">Min: {minValue.toFixed(2)}</span>
                <span className="stat-max">Max: {maxValue.toFixed(2)}</span>
            </div>
        </div>
    );
};

export default MiniChart;
