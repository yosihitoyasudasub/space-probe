import React from 'react';

const ControlsHelp: React.FC = () => {
    return (
        <div className="controls-help">
            <h3>操作方法</h3>
            <div className="help-content">
                <p>← : 進行方向の左に推進</p>
                <p>→ : 進行方向の右に推進</p>
                <p>↑ : 進行方向に加速</p>
                <p>↓ : 進行方向に減速（ブレーキ）</p>
                <p>R : リスタート</p>
                <p className="help-note">
                    ※矢印キーは常に探査機の速度方向を基準にします
                </p>
            </div>
        </div>
    );
};

export default ControlsHelp;
