import React from 'react';

interface CreditsPanelProps {
    totalCredits: number;
    earnedCredits: Record<string, number>;  // missionId -> credits earned
    recentReward?: {
        missionTitle: string;
        baseCredits: number;
        bonusCredits: number;
        totalCredits: number;
    } | null;
}

const CreditsPanel: React.FC<CreditsPanelProps> = ({
    totalCredits,
    earnedCredits,
    recentReward,
}) => {
    const totalMissionsCompleted = Object.keys(earnedCredits).length;
    const totalEarned = Object.values(earnedCredits).reduce((sum, credits) => sum + credits, 0);

    return (
        <div className="credits-panel">
            <div className="credits-header">
                <h2 className="credits-title">Credits</h2>
                <div className="credits-total">
                    <span className="credits-amount">{totalCredits.toLocaleString()}</span>
                    <span className="credits-label">CR</span>
                </div>
            </div>

            <div className="credits-stats">
                <div className="credit-stat-item">
                    <span className="stat-label">Missions Completed:</span>
                    <span className="stat-value">{totalMissionsCompleted}</span>
                </div>
                <div className="credit-stat-item">
                    <span className="stat-label">Total Earned:</span>
                    <span className="stat-value">{totalEarned.toLocaleString()} CR</span>
                </div>
            </div>

            {recentReward && (
                <div className="recent-reward">
                    <div className="reward-header">Recent Reward</div>
                    <div className="reward-mission">{recentReward.missionTitle}</div>
                    <div className="reward-breakdown">
                        <div className="reward-line">
                            <span>Base Reward:</span>
                            <span className="reward-amount">+{recentReward.baseCredits} CR</span>
                        </div>
                        {recentReward.bonusCredits > 0 && (
                            <div className="reward-line bonus">
                                <span>Bonus (Fuel Efficiency):</span>
                                <span className="reward-amount">+{recentReward.bonusCredits} CR</span>
                            </div>
                        )}
                        <div className="reward-line total">
                            <span>Total:</span>
                            <span className="reward-amount">+{recentReward.totalCredits} CR</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CreditsPanel;
