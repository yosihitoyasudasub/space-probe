import React from 'react';
import './globals.css';

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="ja">
            <head>
                {/* Fonts now loaded locally from globals.css for Safari compatibility */}
            </head>
            <body>
                {children}
            </body>
        </html>
    );
};

export default Layout;