import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  Gift,
  Trophy,
  ShieldAlert,
  FileCheck,
  Activity,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Lock,
  Loader2,
} from 'lucide-react';
import {
  getAdminOverview,
  triggerWinnerDraw,
  setGiveawayStatus,
  getFraudEvents,
  getAllClaims,
  processClaim,
  getAuditLogs,
} from '../../services/adminApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { CustomLoader } from '../../components/CustomLoader/CustomLoader.jsx';
import styles from './AdminDashboard.module.css';

export const AdminDashboard = () => {
  const { user, isAdmin, switchAccount } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'fraud' | 'claims' | 'audit'

  const [overviewData, setOverviewData] = useState(null);
  const [fraudEvents, setFraudEvents] = useState([]);
  const [claims, setClaims] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchAdminData = async () => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [ovRes, fraudRes, claimsRes, auditRes] = await Promise.all([
        getAdminOverview(),
        getFraudEvents(),
        getAllClaims(),
        getAuditLogs(),
      ]);

      if (ovRes.success) setOverviewData(ovRes);
      if (fraudRes.success) setFraudEvents(fraudRes.events || []);
      if (claimsRes.success) setClaims(claimsRes.claims || []);
      if (auditRes.success) setAuditLogs(auditRes.logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [isAdmin]);

  const handleDrawWinners = async (giveawayId) => {
    if (!window.confirm('Trigger cryptographic random winner draw for this giveaway?')) return;
    setActionLoading(true);
    try {
      const res = await triggerWinnerDraw(giveawayId);
      setNotice({ type: 'success', message: res.message });
      fetchAdminData();
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (giveawayId, newStatus) => {
    setActionLoading(true);
    try {
      const res = await setGiveawayStatus(giveawayId, newStatus);
      setNotice({ type: 'success', message: res.message });
      fetchAdminData();
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleProcessClaim = async (claimId, status, trackingOrCode) => {
    setActionLoading(true);
    try {
      const payload = { status };
      if (status === 'COMPLETED') {
        payload.voucherCode = trackingOrCode || 'AMZ-PROMO-2026-WINNER';
        payload.trackingNumber = trackingOrCode || 'BLUEDART-IND-9948271';
        payload.courierPartner = 'BlueDart Express Air';
      }
      const res = await processClaim(claimId, payload);
      setNotice({ type: 'success', message: res.message });
      fetchAdminData();
    } catch (err) {
      setNotice({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className={`veloop-container ${styles.deniedWrapper}`}>
        <div className={styles.deniedCard}>
          <Lock size={48} className={styles.lockIcon} />
          <h2>Admin Authentication Required</h2>
          <p>You need administrator permissions to access the giveaway operations and fraud mitigation console.</p>
          <button
            className="btn-veloop-gold"
            onClick={() => switchAccount('admin@veloop.io', 'admin123')}
          >
            <span>Switch to Admin Profile</span>
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <CustomLoader message="Loading Admin operations and security telemetry..." />;
  }

  const stats = overviewData?.stats;
  const recentGiveaways = overviewData?.recentGiveaways || [];

  return (
    <div className={styles.adminPage}>
      <div className={`veloop-container ${styles.container}`}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <div className={styles.adminBadge}>
              <LayoutDashboard size={14} />
              <span>VELOOP OPERATIONS CONSOLE</span>
            </div>
            <h1 className={styles.title}>Giveaway Management & Telemetry</h1>
            <p className={styles.subtitle}>
              Manage giveaway events, trigger cryptographic winner draws, inspect fraud telemetry, and dispatch claims.
            </p>
          </div>

          {/* Quick Refresh */}
          <button className="btn-veloop-secondary" onClick={fetchAdminData} disabled={actionLoading}>
            <RotateCcw size={16} />
            <span>Refresh Telemetry</span>
          </button>
        </div>

        {/* Action Notice */}
        {notice && (
          <div className={notice.type === 'success' ? styles.successNotice : styles.errorNotice}>
            {notice.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{notice.message}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <Users size={20} className={styles.purpleIcon} />
            <div className={styles.statCol}>
              <span className={styles.statLabel}>Total Members</span>
              <span className={styles.statVal}>{stats?.totalUsers}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <Gift size={20} className={styles.blueIcon} />
            <div className={styles.statCol}>
              <span className={styles.statLabel}>Total Giveaways</span>
              <span className={styles.statVal}>{stats?.totalGiveaways}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <Activity size={20} className={styles.greenIcon} />
            <div className={styles.statCol}>
              <span className={styles.statLabel}>Active Entries</span>
              <span className={styles.statVal}>{stats?.totalParticipations}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <Trophy size={20} className={styles.goldIcon} />
            <div className={styles.statCol}>
              <span className={styles.statLabel}>Winners Finalized</span>
              <span className={styles.statVal}>{stats?.totalWinners}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <ShieldAlert size={20} className={styles.redIcon} />
            <div className={styles.statCol}>
              <span className={styles.statLabel}>Fraud Alerts</span>
              <span className={styles.statVal}>{stats?.fraudAlerts}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <FileCheck size={20} className={styles.goldIcon} />
            <div className={styles.statCol}>
              <span className={styles.statLabel}>Pending Claims</span>
              <span className={styles.statVal}>{stats?.pendingClaims}</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabsRow}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'overview' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Gift size={16} />
            <span>Giveaways & Draws</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'claims' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('claims')}
          >
            <FileCheck size={16} />
            <span>Prize Claims ({claims.length})</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'fraud' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('fraud')}
          >
            <ShieldAlert size={16} />
            <span>Fraud Telemetry ({fraudEvents.length})</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'audit' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('audit')}
          >
            <Activity size={16} />
            <span>Audit Trail ({auditLogs.length})</span>
          </button>
        </div>

        {/* Tab 1: Giveaways & Draw Trigger */}
        {activeTab === 'overview' && (
          <div className={styles.tabContent}>
            <div className={styles.tableCard}>
              <h3 className={styles.cardHeader}>Giveaway Campaign Controls</h3>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Giveaway Event</th>
                      <th>Status</th>
                      <th>Prizes</th>
                      <th>Participants</th>
                      <th>End Date</th>
                      <th>Operational Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentGiveaways.map((gw) => (
                      <tr key={gw.giveawayId}>
                        <td>
                          <strong>{gw.title}</strong>
                          <span className={styles.subText}>{gw.giveawayId}</span>
                        </td>
                        <td>
                          <span className={`badge-status badge-status-${gw.status.toLowerCase()}`}>
                            ● {gw.status}
                          </span>
                        </td>
                        <td>{gw.prizes?.length || 0} Prizes</td>
                        <td>{gw.totalParticipants?.toLocaleString()}</td>
                        <td>{new Date(gw.endAt).toLocaleDateString('en-IN')}</td>
                        <td>
                          <div className={styles.actionBtnsGroup}>
                            {gw.status === 'ACTIVE' && (
                              <button
                                className={styles.actionBtnSmall}
                                onClick={() => handleStatusChange(gw.giveawayId, 'ENDED')}
                                disabled={actionLoading}
                              >
                                End Event
                              </button>
                            )}
                            {gw.status === 'ENDED' && (
                              <button
                                className={styles.drawBtnSmall}
                                onClick={() => handleDrawWinners(gw.giveawayId)}
                                disabled={actionLoading}
                              >
                                <Play size={12} /> Draw Winners
                              </button>
                            )}
                            {gw.status === 'UPCOMING' && (
                              <button
                                className={styles.actionBtnSmall}
                                onClick={() => handleStatusChange(gw.giveawayId, 'ACTIVE')}
                                disabled={actionLoading}
                              >
                                Launch Event
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Prize Claims Management */}
        {activeTab === 'claims' && (
          <div className={styles.tabContent}>
            <div className={styles.tableCard}>
              <h3 className={styles.cardHeader}>Winner Prize Claims & Fulfillment</h3>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Claim ID</th>
                      <th>Winner</th>
                      <th>Prize</th>
                      <th>Fulfillment Details</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {claims.map((claim) => (
                      <tr key={claim.claimId}>
                        <td className={styles.monoTxn}>{claim.claimId}</td>
                        <td>
                          <strong>{claim.user?.username || claim.userId}</strong>
                          <span className={styles.subText}>{claim.user?.email}</span>
                        </td>
                        <td>{claim.prizeName}</td>
                        <td>
                          {claim.claimType === 'PHYSICAL' ? (
                            <div className={styles.shippingDetails}>
                              <span>{claim.physicalDetails?.fullName} ({claim.physicalDetails?.phoneNumber})</span>
                              <span className={styles.subText}>
                                {claim.physicalDetails?.addressLine}, {claim.physicalDetails?.city},{' '}
                                {claim.physicalDetails?.state} - {claim.physicalDetails?.pinCode}
                              </span>
                            </div>
                          ) : (
                            <span>{claim.giftCardDetails?.emailAddress}</span>
                          )}
                        </td>
                        <td>
                          <span className={`badge-status ${claim.status === 'COMPLETED' ? 'badge-status-active' : 'badge-status-upcoming'}`}>
                            {claim.status}
                          </span>
                        </td>
                        <td>
                          {claim.status !== 'COMPLETED' && (
                            <div className={styles.actionBtnsGroup}>
                              <button
                                className={styles.drawBtnSmall}
                                onClick={() => handleProcessClaim(claim.claimId, 'COMPLETED')}
                                disabled={actionLoading}
                              >
                                Mark Dispatched / Fulfilled
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Fraud Telemetry */}
        {activeTab === 'fraud' && (
          <div className={styles.tabContent}>
            <div className={styles.tableCard}>
              <h3 className={styles.cardHeader}>Anti-Abuse & Fraud Risk Telemetry</h3>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Event ID</th>
                      <th>User ID</th>
                      <th>Risk Score</th>
                      <th>Risk Level</th>
                      <th>Action</th>
                      <th>Detected Signals & Reason</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fraudEvents.map((fe) => (
                      <tr key={fe.eventId}>
                        <td className={styles.monoTxn}>{fe.eventId}</td>
                        <td>{fe.userId}</td>
                        <td>
                          <strong style={{ color: fe.riskScore >= 60 ? '#f43f5e' : '#fbbf24' }}>
                            {fe.riskScore}/100
                          </strong>
                        </td>
                        <td>{fe.riskLevel}</td>
                        <td>
                          <span className={`badge-status ${fe.action === 'BLOCKED' ? 'badge-status-ended' : 'badge-status-upcoming'}`}>
                            {fe.action}
                          </span>
                        </td>
                        <td className={styles.subText}>{fe.reason}</td>
                        <td>{new Date(fe.createdAt).toLocaleTimeString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Audit Logs */}
        {activeTab === 'audit' && (
          <div className={styles.tabContent}>
            <div className={styles.tableCard}>
              <h3 className={styles.cardHeader}>Immutable System Audit Trail</h3>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Log ID</th>
                      <th>User</th>
                      <th>Action</th>
                      <th>Amount</th>
                      <th>Result</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.logId}>
                        <td className={styles.monoTxn}>{log.logId}</td>
                        <td>{log.userId || 'SYSTEM'}</td>
                        <td>
                          <strong>{log.action}</strong>
                        </td>
                        <td>
                          {log.amount ? `${log.amount} ${log.currency}` : '—'}
                        </td>
                        <td>
                          <span className={`badge-status ${log.result === 'SUCCESS' ? 'badge-status-active' : 'badge-status-ended'}`}>
                            {log.result}
                          </span>
                        </td>
                        <td>{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
