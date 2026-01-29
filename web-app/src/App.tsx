import { useEffect, useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';

// Adres Twojego API Gateway
const API_URL = 'https://api.voicemessenger.mywire.org';

export default function App() {
    const auth = useAuth();
    const [liveKitToken, setLiveKitToken] = useState('');
    const [liveKitUrl, setLiveKitUrl] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [roomName, setRoomName] = useState('pokoj-glowny');

    // Funkcja pobierająca token LiveKit z Twojego backendu
    const fetchLiveKitToken = async () => {
        if (!auth.user?.access_token) return;
        setIsJoining(true);

        try {
            const response = await fetch(`${API_URL}/api/media/join-channel?channelId=${roomName}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.user.access_token}`, // Automatycznie bierze token z Keycloak
                },
            });

            if (!response.ok) throw new Error('Nie udało się pobrać biletu wstępu.');

            const data = await response.json();
            setLiveKitUrl(data.url);
            setLiveKitToken(data.token);
        } catch (error) {
            console.error(error);
            alert('Błąd połączenia z serwerem mediów.');
            setIsJoining(false);
        }
    };

    // 1. Ekran Ładowania (gdy Keycloak przetwarza logowanie)
    if (auth.isLoading) {
        return <div className="center-screen">🔄 Łączenie z systemem autoryzacji...</div>;
    }

    // 2. Ekran Logowania (dla niezalogowanych)
    if (!auth.isAuthenticated) {
        return (
            <div className="center-screen">
                <h1>Voice Messenger 🎤</h1>
                <p>Musisz się zalogować, aby dołączyć do rozmowy.</p>
                <button onClick={() => auth.signinRedirect()}>
                    ZALOGUJ SIĘ PRZEZ KEYCLOAK
                </button>
            </div>
        );
    }

    // 3. Ekran Pokoju (Zalogowany, ale jeszcze nie połączony z LiveKit)
    if (!liveKitToken) {
        return (
            <div className="center-screen">
                <h1>Witaj, {auth.user?.profile.preferred_username}! 👋</h1>

                <div style={{ margin: '20px 0' }}>
                    <label>Wybierz pokój: </label>
                    <input
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        style={{ padding: '8px', marginLeft: '10px' }}
                    />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={fetchLiveKitToken} disabled={isJoining}>
                        {isJoining ? 'Pobieranie biletu...' : 'DOŁĄCZ DO ROZMOWY'}
                    </button>

                    <button
                        onClick={() => auth.removeUser()}
                        style={{ backgroundColor: '#444' }}
                    >
                        Wyloguj
                    </button>
                </div>
            </div>
        );
    }

    // 4. Ekran Rozmowy (LiveKit)
    return (
        <LiveKitRoom
            video={true}
            audio={true}
            token={liveKitToken}
            serverUrl={liveKitUrl}
            connect={true}
            data-lk-theme="default"
            style={{ height: '100vh' }}
            onDisconnected={() => setLiveKitToken('')} // Po rozłączeniu wróć do menu
        >
            <VideoConference />
        </LiveKitRoom>
    );
}