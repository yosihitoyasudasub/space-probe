import React from 'react';

interface HUDProps {
    status?: string;
    velocity?: number;
    distance?: number;
    fuel?: number;
    slingshots?: number;
}

const HUD: React.FC<HUDProps> = ({
    status = 'Idle',
    velocity = 0,
    distance = 0,
    fuel = 100,
    slingshots = 0,
}) => {
    return (
        <div id="ui">
            <h2>探査機データ</h2>
            <p><span className="stat-label">状態:</span><span className="stat-value">{status}</span></p>
            <p><span className="stat-label">速度:</span><span className="stat-value">{velocity.toFixed(1)}</span> km/s</p>
            <p><span className="stat-label">距離:</span><span className="stat-value">{distance.toFixed(2)}</span> AU</p>
            <p><span className="stat-label">燃料:</span><span className="stat-value">{fuel.toFixed(1)}</span>%</p>
            <p><span className="stat-label">スイングバイ:</span><span className="stat-value">{slingshots}</span> 回</p>
        </div>
    );
};

export default HUD;