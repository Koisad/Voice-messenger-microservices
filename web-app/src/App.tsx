import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from 'react-oidc-context';
import { LiveKitRoom, VideoConference } from '@livekit/components-react';
import '@livekit/components-styles';
import { api } from './api/client';
import type { Server, Message } from './types';
import './App.css';
import { Hash, Volume2, Plus, LogOut, Copy, User } from 'lucide-react';

export default function App() {
    const auth = useAuth();

    // --- STAN DANYCH ---
    const [servers, setServers] = useState<Server[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [members, setMembers] = useState<string[]>([]);

    // --- STAN UI ---
    const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
    const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState<'CREATE' | 'JOIN'>('CREATE');
    const [inputVal, setInputVal] = useState(""); // Nazwa serwera LUB ID serwera
    const [messageInput, setMessageInput] = useState("");

    // --- STAN LIVEKIT (GŁOS) ---
    const [liveKitToken, setLiveKitToken] = useState("");
    const [liveKitUrl, setLiveKitUrl] = useState("");
    const [isVoiceActive, setIsVoiceActive] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const selectedServer = servers.find(s => s.id === selectedServerId);
    const selectedChannel = selectedServer?.channels.find(c => c.id === selectedChannelId);

    // 1. Inicjalizacja po zalogowaniu
    useEffect(() => {
        if (auth.isAuthenticated) {
            loadServers();
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [auth.isAuthenticated]);

    // 2. Obsługa zmiany kanału (Tekst vs Głos)
    useEffect(() => {
        if (!selectedChannel) return;

        if (selectedChannel.type === 'VOICE') {
            // Wchodzimy na głosowy -> Pobierz token
            api.getLiveKitToken(selectedChannel.id)
                .then(data => {
                    setLiveKitToken(data.token);
                    setLiveKitUrl(data.serverUrl);
                    setIsVoiceActive(true);
                })
                .catch(err => console.error("Błąd LiveKit:", err));
        } else {
            // Wchodzimy na tekstowy -> Wyłącz głos, pobierz wiadomości
            setIsVoiceActive(false);
            setLiveKitToken("");
            fetchMessages();
        }
    }, [selectedChannelId]);

    // 3. Polling wiadomości (tylko na kanale tekstowym)
    useEffect(() => {
        if (isVoiceActive || !selectedServerId || !selectedChannelId) return;

        // Pierwsze pobranie
        fetchMessages();

        const interval = setInterval(fetchMessages, 3000);
        return () => clearInterval(interval);
    }, [selectedServerId, selectedChannelId, isVoiceActive]);

    // 4. Pobieranie listy członków serwera
    useEffect(() => {
        if (selectedServerId) {
            api.getServerMembers(selectedServerId).then(setMembers).catch(console.error);
        }
    }, [selectedServerId]);

    // 5. Scrollowanie czatu
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);


    // --- FUNKCJE POMOCNICZE ---

    const loadServers = async () => {
        try {
            const data = await api.getServers();
            setServers(data);
        } catch (err) { console.error(err); }
    };

    const fetchMessages = () => {
        if (!selectedServerId || !selectedChannelId) return;
        api.getMessages(selectedServerId, selectedChannelId).then(setMessages).catch(console.error);
    };

    const handleModalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputVal.trim()) return;

        try {
            if (modalMode === 'CREATE') {
                const newServer = await api.createServer(inputVal);
                setServers([...servers, newServer]);
                setSelectedServerId(newServer.id);
            } else {
                await api.joinServer(inputVal); // inputVal to tutaj ID
                await loadServers();
            }
            setShowModal(false);
            setInputVal("");
        } catch (err) {
            alert("Operacja nieudana. Sprawdź ID lub spróbuj ponownie.");
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!messageInput.trim() || !selectedServerId || !selectedChannelId) return;

        try {
            await api.sendMessage(selectedServerId, selectedChannelId, messageInput);
            setMessageInput("");
            fetchMessages();
        } catch (err) { console.error(err); }
    };

    const copyInvite = () => {
        if (selectedServerId) {
            navigator.clipboard.writeText(selectedServerId);
            alert("Skopiowano ID serwera! Wyślij je znajomemu, aby dołączył.");
        }
    };


    // --- EKRANY ŁADOWANIA / LOGOWANIA ---

    if (auth.isLoading) return <div className="center-screen">Ładowanie...</div>;
    if (auth.error) return <div className="center-screen">Błąd logowania: {auth.error.message}</div>;

    if (!auth.isAuthenticated) {
        return (
            <div className="center-screen flex-col">
                <h1>Voice Messenger</h1>
                <button className="btn btn-primary" onClick={() => auth.signinRedirect()}>
                    Zaloguj przez Keycloak
                </button>
            </div>
        );
    }

    // --- GŁÓWNY WIDOK APLIKACJI ---

    return (
        <div className="app-layout">

            {/* 1. PASEK SERWERÓW */}
            <nav className="server-sidebar">
                {servers.map(server => (
                    <div
                        key={server.id}
                        className={`server-icon ${selectedServerId === server.id ? 'active' : ''}`}
                        onClick={() => {
                            setSelectedServerId(server.id);
                            if (server.channels?.length > 0) setSelectedChannelId(server.channels[0].id);
                        }}
                        title={server.name}
                    >
                        {(server.name || "?").substring(0, 2).toUpperCase()}
                    </div>
                ))}

                <div className="server-icon server-icon-add" onClick={() => {
                    setModalMode('CREATE');
                    setShowModal(true);
                }}>
                    <Plus />
                </div>

                <div className="server-icon logout-icon" onClick={() => auth.removeUser()}>
                    <LogOut />
                </div>
            </nav>

            {/* 2. PASEK KANAŁÓW */}
            {selectedServer ? (
                <div className="channel-sidebar">
                    <header className="server-header">
            <span title={selectedServer.name}>
              {(selectedServer.name || "Bez nazwy").length > 15
                  ? selectedServer.name?.substring(0,15) + "..."
                  : selectedServer.name}
            </span>
                        <Copy size={18} className="icon-btn" onClick={copyInvite} title="Skopiuj ID zaproszenia" />
                    </header>

                    <div className="channel-list">
                        {selectedServer.channels?.map(channel => (
                            <div
                                key={channel.id}
                                className={`channel-item ${selectedChannelId === channel.id ? 'active' : ''}`}
                                onClick={() => setSelectedChannelId(channel.id)}
                            >
                                {channel.type === 'VOICE' ? <Volume2 size={18} /> : <Hash size={18} />}
                                {channel.name}
                            </div>
                        ))}
                    </div>

                    <div className="user-bar">
                        <div className="username">{auth.user?.profile.preferred_username}</div>
                        <div className="status">Online</div>
                    </div>
                </div>
            ) : (
                <div className="channel-sidebar placeholder">
                    <p>Wybierz serwer</p>
                </div>
            )}

            {/* 3. GŁÓWNY OBSZAR */}
            <main className="chat-area">
                {!selectedServerId ? (
                    <div className="welcome">
                        <h2>Witaj w Voice Messenger 👋</h2>
                        <p>Wybierz serwer z lewej strony lub stwórz nowy.</p>
                    </div>
                ) : isVoiceActive && liveKitToken ? (
                    // --- WIDOK VIDEO/AUDIO ---
                    <LiveKitRoom
                        video={false}
                        audio={true}
                        token={liveKitToken}
                        serverUrl={liveKitUrl}
                        connect={true}
                        data-lk-theme="default"
                        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                    >
                        <VideoConference />
                    </LiveKitRoom>
                ) : (
                    // --- WIDOK CZATU TEKSTOWEGO ---
                    <>
                        <header className="chat-header">
                            <Hash size={24} color="#949ba4" />
                            <span>{selectedChannel?.name || "Czat"}</span>
                        </header>

                        <div className="messages-list">
                            {messages.map((msg, i) => (
                                <div key={i} className="message-item">
                                    <div className="message-avatar" />
                                    <div className="message-content">
                                        <div className="message-header">
                      <span className="author">
                        {msg.senderId === auth.user?.profile.preferred_username ? 'Ty' : msg.senderId}
                      </span>
                                            <span className="time">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="text">{msg.content}</div>
                                    </div>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        <form className="chat-input-area" onSubmit={handleSendMessage}>
                            <div className="chat-input-wrapper">
                                <input
                                    className="chat-input"
                                    value={messageInput}
                                    onChange={e => setMessageInput(e.target.value)}
                                    placeholder={`Napisz na #${selectedChannel?.name || "czacie"}`}
                                />
                            </div>
                        </form>
                    </>
                )}
            </main>

            {/* 4. LISTA CZŁONKÓW */}
            {selectedServer && !isVoiceActive && (
                <aside className="members-sidebar">
                    <h3>CZŁONKOWIE — {members.length}</h3>
                    {members.map((m, i) => (
                        <div key={i} className="member-item">
                            <div className="message-avatar small" />
                            <span>{m}</span>
                        </div>
                    ))}
                </aside>
            )}

            {/* 5. MODAL TWORZENIA / DOŁĄCZANIA */}
            {showModal && (
                <div className="modal-overlay" onClick={(e) => { if(e.target === e.currentTarget) setShowModal(false) }}>
                    <div className="modal-content">
                        <div className="modal-tabs">
                            <button
                                className={modalMode === 'CREATE' ? 'active' : ''}
                                onClick={() => setModalMode('CREATE')}
                            >
                                Stwórz Serwer
                            </button>
                            <button
                                className={modalMode === 'JOIN' ? 'active' : ''}
                                onClick={() => setModalMode('JOIN')}
                            >
                                Dołącz do Serwera
                            </button>
                        </div>

                        <form onSubmit={handleModalSubmit}>
                            <label>
                                {modalMode === 'CREATE' ? 'NAZWA SERWERA' : 'ID SERWERA (ZAPROSZENIE)'}
                            </label>
                            <input
                                className="input-field"
                                value={inputVal}
                                onChange={(e) => setInputVal(e.target.value)}
                                autoFocus
                                placeholder={modalMode === 'CREATE' ? 'Np. Gaming Room' : 'Wklej ID tutaj...'}
                            />
                            <button type="submit" className="btn btn-primary w-full" style={{marginTop: 20}}>
                                {modalMode === 'CREATE' ? 'Utwórz' : 'Dołącz'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}