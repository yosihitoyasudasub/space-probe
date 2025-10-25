import React from 'react';
import './globals.css';

const Layout = ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="ja">
            <body>
                {children}
            </body>
        </html>
    );
};

export default Layout;