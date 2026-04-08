import LoginPopup from '@/components/login';
import React from 'react';

const LoginPage: React.FC = () => {

    return (
        <div className="min-h-screen flex flex-col flex-1 justify-center items-center">

            <LoginPopup />
        </div>
    );
};

export default LoginPage;