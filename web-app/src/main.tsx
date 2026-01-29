import React from 'react';
import ReactDOM from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import App from './App.tsx';
import './index.css';

const oidcConfig = {
    authority: "https://auth.voicemessenger.mywire.org/realms/voice-messenger",
    client_id: "frontend-client", // To ID, które stworzyłeś w kroku 0
    redirect_uri: window.location.origin, // Wraca tam, skąd przyszedł (np. https://voicemessenger...)
    onSigninCallback: () => {
        // Czyści brzydki kod ?code=... z paska adresu po zalogowaniu
        window.history.replaceState({}, document.title, window.location.pathname);
    }
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <AuthProvider {...oidcConfig}>
            <App />
        </AuthProvider>
    </React.StrictMode>,
);