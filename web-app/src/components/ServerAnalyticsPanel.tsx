import React, { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api/client';
import type { NetworkMetric } from '../types';
import { BarChart3, Wifi, Server, ChevronDown } from 'lucide-react';
import './ServerAnalyticsPanel.css';

interface Props {
    serverId: string | null;
    mediaServerUrl: string;
}

type PanelTab = 'room' | 'media';

const avg = (values: (number | null)[]): number => {
    const valid = values.filter((v): v is number => v !== null && v !== undefined);
    if (valid.length === 0) return 0;
    return valid.reduce((a, b) => a + b, 0) / valid.length;
};

function rttClass(v: number): string {
    if (v <= 0) return '';
    if (v < 50) return 'good';
    if (v < 150) return 'warn';
    return 'bad';
}

function lossClass(v: number): string {
    if (v <= 0) return '';
    if (v < 1) return 'good';
    if (v < 5) return 'warn';
    return 'bad';
}

function jitterClass(v: number): string {
    if (v <= 0) return '';
    if (v < 20) return 'good';
    if (v < 50) return 'warn';
    return 'bad';
}

export const ServerAnalyticsPanel: React.FC<Props> = ({ serverId, mediaServerUrl }) => {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState<PanelTab>('room');
    const [metrics, setMetrics] = useState<NetworkMetric[]>([]);
    const [loading, setLoading] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchMetrics = useCallback(async () => {
        try {
            setLoading(true);
            if (tab === 'room' && serverId) {
                const data = await api.getRoomMetrics(serverId);
                setMetrics(data);
            } else if (tab === 'media' && mediaServerUrl) {
                const data = await api.getServerMetrics(mediaServerUrl);
                setMetrics(data);
            } else {
                setMetrics([]);
            }
        } catch (err) {
            console.error('[ServerAnalyticsPanel] fetch error:', err);
            setMetrics([]);
        } finally {
            setLoading(false);
        }
    }, [tab, serverId, mediaServerUrl]);

    // Auto-refresh only when panel is open
    useEffect(() => {
        if (!open) return;

        fetchMetrics();
        intervalRef.current = setInterval(fetchMetrics, 15000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [open, fetchMetrics]);

    const avgRtt = avg(metrics.map(m => m.rtt));
    const avgLoss = avg(metrics.map(m => m.packetLossRatio));
    const avgJitter = avg(metrics.map(m => m.jitter));

    return (
        <div className="server-analytics-panel">
            <div className="server-analytics-header" onClick={() => setOpen(!open)}>
                <h4>
                    <BarChart3 size={12} />
                    Analityka
                </h4>
                <ChevronDown size={14} className={`server-analytics-chevron ${open ? 'open' : ''}`} />
            </div>

            {open && (
                <div className="server-analytics-body">
                    <div className="server-analytics-tabs">
                        <button
                            className={`server-analytics-tab ${tab === 'room' ? 'active' : ''}`}
                            onClick={() => setTab('room')}
                        >
                            <Wifi size={10} /> Pokój
                        </button>
                        <button
                            className={`server-analytics-tab ${tab === 'media' ? 'active' : ''}`}
                            onClick={() => setTab('media')}
                        >
                            <Server size={10} /> Media
                        </button>
                    </div>

                    {loading && metrics.length === 0 ? (
                        <div className="server-analytics-loading">
                            <span className="mini-spinner" /> Ładowanie...
                        </div>
                    ) : metrics.length === 0 ? (
                        <div className="server-analytics-empty">
                            Brak danych — dołącz do kanału głosowego
                        </div>
                    ) : (
                        <div className="server-analytics-kpis">
                            <div className={`server-analytics-kpi ${rttClass(avgRtt)}`}>
                                <div className="kpi-label">RTT</div>
                                <div className="kpi-val">
                                    {avgRtt.toFixed(0)}
                                    <span className="unit">ms</span>
                                </div>
                            </div>
                            <div className={`server-analytics-kpi ${lossClass(avgLoss)}`}>
                                <div className="kpi-label">Strata</div>
                                <div className="kpi-val">
                                    {avgLoss.toFixed(1)}
                                    <span className="unit">%</span>
                                </div>
                            </div>
                            <div className={`server-analytics-kpi ${jitterClass(avgJitter)}`}>
                                <div className="kpi-label">Jitter</div>
                                <div className="kpi-val">
                                    {avgJitter.toFixed(0)}
                                    <span className="unit">ms</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
