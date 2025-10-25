import React from 'react';

interface Mission {
    id: string;
    title: string;
    description: string;
    target: number;
    current: number;
    unit: string;
    completed: boolean;
}

interface MissionProgressProps {
    distance: number;
    velocity: number;
    slingshots: number;
    fuel: number;
}

const MissionProgress: React.FC<MissionProgressProps> = ({
    distance,
    velocity,
    slingshots,
    fuel,
}) => {
    const missions: Mission[] = [
        {
            id: 'reach-1au',
            title: '1 AU到達',
            description: '地球の公転軌道半径に到達',
            target: 1,
            current: distance,
            unit: 'AU',
            completed: distance >= 1,
        },
        {
            id: 'reach-5au',
            title: '5 AU到達',
            description: '木星軌道付近に到達',
            target: 5,
            current: distance,
            unit: 'AU',
            completed: distance >= 5,
        },
        {
            id: 'speed-20',
            title: '高速飛行',
            description: '20 km/s以上の速度を達成',
            target: 20,
            current: velocity,
            unit: 'km/s',
            completed: velocity >= 20,
        },
        {
            id: 'slingshot-3',
            title: 'スイングバイマスター',
            description: '3回以上のスイングバイ実行',
            target: 3,
            current: slingshots,
            unit: '回',
            completed: slingshots >= 3,
        },
        {
            id: 'fuel-efficient',
            title: '燃料節約',
            description: '燃料50%以上残して5 AU到達',
            target: 5,
            current: distance,
            unit: 'AU',
            completed: distance >= 5 && fuel >= 50,
        },
    ];

    const completedCount = missions.filter(m => m.completed).length;
    const totalMissions = missions.length;
    const completionPercentage = (completedCount / totalMissions) * 100;

    return (
        <div className="mission-progress">
            <div className="mission-header">
                <h3>ミッション進捗</h3>
                <div className="overall-progress">
                    <span className="progress-text">
                        {completedCount} / {totalMissions} 完了
                    </span>
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${completionPercentage}%` }}
                        />
                    </div>
                </div>
            </div>
            <div className="mission-list">
                {missions.map(mission => {
                    const progress = Math.min((mission.current / mission.target) * 100, 100);
                    return (
                        <div
                            key={mission.id}
                            className={`mission-item ${mission.completed ? 'completed' : ''}`}
                        >
                            <div className="mission-info">
                                <div className="mission-title">
                                    {mission.completed && <span className="checkmark">✓</span>}
                                    {mission.title}
                                </div>
                                <div className="mission-description">{mission.description}</div>
                            </div>
                            <div className="mission-status">
                                <span className="mission-value">
                                    {mission.current.toFixed(1)} / {mission.target} {mission.unit}
                                </span>
                                <div className="mission-progress-bar">
                                    <div
                                        className="mission-progress-fill"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MissionProgress;
