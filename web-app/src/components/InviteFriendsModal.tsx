import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import type { Friendship } from '../types';
import { X, Check } from 'lucide-react';
// import './UserProfileModal.css'; // Removed non-existent import

interface InviteFriendsModalProps {
    serverName: string;
    serverId: string;
    onClose: () => void;
}

export const InviteFriendsModal: React.FC<InviteFriendsModalProps> = ({ serverName, serverId, onClose }) => {
    const [friends, setFriends] = useState<Friendship[]>([]);
    const [loading, setLoading] = useState(true);
    const [invitedFriends, setInvitedFriends] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadFriends();
    }, []);

    const loadFriends = async () => {
        try {
            const data = await api.getFriends();
            setFriends(data);
        } catch (err) {
            console.error('Failed to load friends:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (friend: Friendship) => {
        const friendId = friend.friendId;
        const friendName = friend.friendDisplayName || friend.friendUsername;

        try {
            // 1. Get/Create DM Channel
            const { channelId } = await api.getDMChannel(friendId);

            // 2. Send Invite Message
            const inviteLink = `${window.location.origin}?joinServer=${serverId}`;
            const message = `Hej! Zapraszam Cię na serwer **${serverName}**.\nKod dołączenia to: \`${serverId}\`\n\nWejdź w link, aby dołączyć: ${inviteLink}`;

            await api.sendMessage('dm', channelId, message);

            // 3. Mark as invited
            setInvitedFriends(prev => new Set(prev).add(friendId));
        } catch (err) {
            console.error(`Failed to invite ${friendName}:`, err);
            alert(`Nie udało się wysłać zaproszenia do ${friendName}`);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '400px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
                <div className="modal-header">
                    <h2>Zaproś znajomych</h2>
                    <button className="modal-close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-content" style={{ overflowY: 'auto', paddingRight: '4px' }}>
                    <p style={{ color: '#949ba4', fontSize: '14px', marginBottom: '16px' }}>
                        Wybierz znajomych, których chcesz zaprosić na serwer <strong>{serverName}</strong>.
                    </p>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>Ładowanie...</div>
                    ) : friends.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#949ba4', padding: '20px' }}>
                            Nie masz jeszcze znajomych :(
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {friends.map(friend => {
                                const friendId = friend.friendId;
                                const displayName = friend.friendDisplayName;
                                const username = friend.friendUsername;
                                const avatarUrl = friend.friendAvatarUrl;
                                const isInvited = invitedFriends.has(friendId);

                                return (
                                    <div key={friend.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '8px',
                                        borderRadius: '4px',
                                        backgroundColor: 'var(--bg-tertiary)'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%',
                                                backgroundColor: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                overflow: 'hidden'
                                            }}>
                                                {avatarUrl ? (
                                                    <img src={avatarUrl} alt={username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <span style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                                                        {(displayName || username || '?').charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                                                    {displayName || username}
                                                </span>
                                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                                    @{username}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleInvite(friend)}
                                            disabled={isInvited}
                                            style={{
                                                backgroundColor: isInvited ? 'transparent' : 'var(--brand)',
                                                border: isInvited ? '1px solid var(--success)' : 'none',
                                                color: isInvited ? 'var(--success)' : 'white',
                                                padding: '6px 12px',
                                                borderRadius: '4px',
                                                cursor: isInvited ? 'default' : 'pointer',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px',
                                                transition: 'all 0.2s',
                                                opacity: isInvited ? 0.8 : 1
                                            }}
                                        >
                                            {isInvited ? (
                                                <>
                                                    <Check size={14} /> Wysłano
                                                </>
                                            ) : (
                                                <>
                                                    Zaproszenie
                                                </>
                                            )}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
