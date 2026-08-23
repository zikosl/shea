import LoginPopup from '@/components/login';
import React from 'react';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const LoginPage: React.FC = () => {

    return (
        <div className="min-h-screen flex flex-col flex-1 justify-center items-center">

            <LoginPopup />
        </div>
    );
};

export default LoginPage;