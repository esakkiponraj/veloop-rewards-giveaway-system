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
  Package,
  Layers,
  Sparkles,
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
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'breakdown' | 'claims' | 'fraud' | 'audit'

  const [overviewData, setOverviewData] = useState(null);
  const [fraudEvents, setFraudEvents] = useState([]);
  const [claims, setClaims] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState(null);

  // Status Change Confirmation Modal State
  const [statusModal, setStatusModal] = useState({ open: false, giveawayId: null, newStatus: null });

  // Winner Draw Confirmation & Results Modal State
  const [drawModal, setDrawModal] = useState({ open: false, giveawayId: null, giveawayTitle: null });
  const [drawResults, setDrawResults] = useState(null);

  // Claim Processing Modal State
  const [claimModal, setClaimModal] = useState({
    open: false,
    claim: null,
    status: 'COMPLETED',
    courierPartner: '',
    trackingNumber: '',
    voucherCode: '',
    notes: '',
  });

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

  const confirmStatusChange = async () => {
    if (!statusModal.giveawayId || !statusModal.newStatus) return;
    setActionLoading(true);
    try {
      const res = await setGiveawayStatus(statusModal.giveawayId, statusModal.newStatus);
      setNotice({ type: 'success', message: res.message || `Campaign status updated to ${statusModal.newStatus}.` });
      setStatusModal({ open: false, giveawayId: null, newStatus: null });
      fetchAdminData();
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Failed to update campaign status.' });
    } finally {
      setActionLoading(false);
    }
  };

  const confirmDrawWinners = async () => {
    if (!drawModal.giveawayId) return;
    setActionLoading(true);
    try {
      const res = await triggerWinnerDraw(drawModal.giveawayId);
      setDrawResults(res);
      setNotice({ type: 'success', message: res.message || 'Winner selection executed successfully.' });
      setDrawModal({ open: false, giveawayId: null, giveawayTitle: null });
      fetchAdminData();
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Winner draw failed.' });
      setDrawModal({ open: false, giveawayId: null, giveawayTitle: null });
    } finally {
      setActionLoading(false);
    }
  };

  const submitProcessClaim = async (e) => {
    e.preventDefault();
    if (!claimModal.claim) return;
    setActionLoading(true);
    try {
      const payload = {
        status: claimModal.status,
        courierPartner: claimModal.courierPartner,
        trackingNumber: claimModal.trackingNumber,
        voucherCode: claimModal.voucherCode,
        notes: claimModal.notes,
      };
      const res = await processClaim(claimModal.claim.claimId, payload);
      setNotice({ type: 'success', message: res.message || 'Claim processed successfully.' });
      setClaimModal({ open: false, claim: null, status: 'COMPLETED', courierPartner: '', trackingNumber: '', voucherCode: '', notes: '' });
      fetchAdminData();
    } catch (err) {
      setNotice({ type: 'error', message: err.message || 'Failed to process claim.' });
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
  const prizeBreakdown = overviewData?.prizeBreakdown || [];

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
              Manage giveaway lifecycles, trigger weighted winner draws, inspect fraud telemetry, and dispatch verified claims.
            </p>
          </div>

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
              <span className={styles.statVal}>{stats?.totalUsers || 0}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <Gift size={20} className={styles.blueIcon} />
            <div className={styles.statCol}>
              <span className={styles.statLabel}>Total Giveaways</span>
              <span className={styles.statVal}>{stats?.totalGiveaways || 0}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <Activity size={20} className={styles.greenIcon} />
            <div className={styles.statCol}>
              <span className={styles.statLabel}>Total Entries</span>
              <span className={styles.statVal}>{stats?.totalEntries || 0}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <Trophy size={20} className={styles.goldIcon} />
            <div className={styles.statCol}>
              <span className={styles.statLabel}>Winners Finalized</span>
              <span className={styles.statVal}>{stats?.totalWinners || 0}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <ShieldAlert size={20} className={styles.redIcon} />
            <div className={styles.statCol}>
              <span className={styles.statLabel}>Fraud Alerts</span>
              <span className={styles.statVal}>{stats?.fraudAlerts || 0}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <FileCheck size={20} className={styles.goldIcon} />
            <div className={styles.statCol}>
              <span className={styles.statLabel}>Pending Claims</span>
              <span className={styles.statVal}>{stats?.pendingClaims || 0}</span>
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
            <span>Campaign Controls</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'breakdown' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('breakdown')}
          >
            <Layers size={16} />
            <span>Prize Breakdown</span>
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

        {/* Tab 1: Campaign Lifecycle & Draws */}
        {activeTab === 'overview' && (
          <div className={styles.tabContent}>
            <div className={styles.tableCard}>
              <h3 className={styles.cardHeader}>Giveaway Campaign Controls</h3>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Campaign</th>
                      <th>Status</th>
                      <th>Prizes</th>
                      <th>Participants</th>
                      <th>End Date</th>
                      <th>Lifecycle & Winner Actions</th>
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
                        <td>{gw.prizes?.length || 6} Prizes</td>
                        <td>{gw.totalParticipants?.toLocaleString() || 0}</td>
                        <td>{new Date(gw.endAt).toLocaleDateString('en-IN')}</td>
                        <td>
                          <div className={styles.actionBtnsGroup}>
                            {gw.status === 'UPCOMING' && (
                              <button
                                className={styles.actionBtnSmall}
                                onClick={() => setStatusModal({ open: true, giveawayId: gw.giveawayId, newStatus: 'ACTIVE' })}
                                disabled={actionLoading}
                              >
                                Launch Active
                              </button>
                            )}
                            {gw.status === 'ACTIVE' && (
                              <button
                                className={styles.actionBtnSmall}
                                onClick={() => setStatusModal({ open: true, giveawayId: gw.giveawayId, newStatus: 'ENDED' })}
                                disabled={actionLoading}
                              >
                                End Campaign
                              </button>
                            )}
                            {gw.status === 'ENDED' && (
                              <>
                                <button
                                  className={styles.drawBtnSmall}
                                  onClick={() => setDrawModal({ open: true, giveawayId: gw.giveawayId, giveawayTitle: gw.title })}
                                  disabled={actionLoading}
                                >
                                  <Play size={12} /> Draw Winners
                                </button>
                                <button
                                  className={styles.actionBtnSmall}
                                  onClick={() => setStatusModal({ open: true, giveawayId: gw.giveawayId, newStatus: 'ARCHIVED' })}
                                  disabled={actionLoading}
                                >
                                  Archive
                                </button>
                              </>
                            )}
                            {gw.status !== 'ENDED' && (
                              <button
                                className={styles.drawBtnDisabled}
                                title="Campaign must be ENDED before winners can be selected."
                                disabled
                              >
                                <Lock size={12} /> Draw Locked
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

        {/* Tab 2: Prize Breakdown */}
        {activeTab === 'breakdown' && (
          <div className={styles.tabContent}>
            <div className={styles.tableCard}>
              <h3 className={styles.cardHeader}>Active Campaign Prize Allocation & Entries</h3>
              <div className={styles.tableResponsive}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Prize</th>
                      <th>Entry Cost</th>
                      <th>Target Winners</th>
                      <th>Current Winners</th>
                      <th>Distinct Users</th>
                      <th>Total Entry Weight</th>
                      <th>Confirmation Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prizeBreakdown.map((pb) => (
                      <tr key={pb.prizeId}>
                        <td>
                          <strong>{pb.name}</strong>
                          <span className={styles.subText}>{pb.prizeId}</span>
                        </td>
                        <td>{pb.entryAmount} {pb.entryCurrency}</td>
                        <td>{pb.targetWinners}</td>
                        <td>{pb.currentWinners}</td>
                        <td>{pb.participants}</td>
                        <td><strong style={{ color: 'var(--brand-gold)' }}>{pb.totalEntries}</strong></td>
                        <td>
                          {pb.isPendingConfirmation ? (
                            <span className={styles.drawPendingChip}>Pending Merchant Confirmation</span>
                          ) : (
                            <span className={styles.winnerChip}>Ready / Active</span>
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

        {/* Tab 3: Prize Claims */}
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
                          {claim.status !== 'COMPLETED' ? (
                            <button
                              className={styles.drawBtnSmall}
                              onClick={() =>
                                setClaimModal({
                                  open: true,
                                  claim,
                                  status: 'COMPLETED',
                                  courierPartner: claim.trackingInformation?.courierPartner || 'BlueDart Express Air',
                                  trackingNumber: claim.trackingInformation?.trackingNumber || '',
                                  voucherCode: claim.trackingInformation?.voucherCode || '',
                                  notes: claim.notes || '',
                                })
                              }
                              disabled={actionLoading}
                            >
                              <Package size={12} /> Process & Dispatch
                            </button>
                          ) : (
                            <span className={styles.subText}>Fulfilled ✓</span>
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

        {/* Tab 4: Fraud Telemetry */}
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

        {/* Tab 5: Audit Logs */}
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
                      <th>Metadata</th>
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
                        <td className={styles.subText}>
                          {log.metadata?.prizeName || log.metadata?.drawRunId || JSON.stringify(log.metadata || {})}
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

      {/* Confirmation Modal for Lifecycle Transitions */}
      {statusModal.open && (
        <div className={styles.modalBackdrop} onClick={() => setStatusModal({ open: false, giveawayId: null, newStatus: null })}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Confirm Lifecycle Transition</h3>
              <p className={styles.modalSubtitle}>
                Are you sure you want to transition <strong>{statusModal.giveawayId}</strong> to <strong>{statusModal.newStatus}</strong>?
              </p>
            </div>
            <p className={styles.subText}>
              {statusModal.newStatus === 'ENDED'
                ? 'Ending the campaign will lock new entry transactions and enable the weighted random winner selection engine.'
                : 'This action will be recorded in the system audit log.'}
            </p>
            <div className={styles.modalActions}>
              <button
                className="btn-veloop-secondary"
                onClick={() => setStatusModal({ open: false, giveawayId: null, newStatus: null })}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button className="btn-veloop-gold" onClick={confirmStatusChange} disabled={actionLoading}>
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : `Confirm & Transition`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Winner Draw */}
      {drawModal.open && (
        <div className={styles.modalBackdrop} onClick={() => setDrawModal({ open: false, giveawayId: null, giveawayTitle: null })}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Trigger Cryptographic Winner Draw</h3>
              <p className={styles.modalSubtitle}>
                You are about to run the weighted winner selection engine for <strong>{drawModal.giveawayTitle}</strong>.
              </p>
            </div>
            <p className={styles.subText}>
              • Winner probabilities are proportional to each participant's entry weight.<br />
              • Uses Node.js crypto.randomInt() secure randomness.<br />
              • Automatically skips pending prizes and produces an immutable audit record.
            </p>
            <div className={styles.modalActions}>
              <button
                className="btn-veloop-secondary"
                onClick={() => setDrawModal({ open: false, giveawayId: null, giveawayTitle: null })}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button className="btn-veloop-gold" onClick={confirmDrawWinners} disabled={actionLoading}>
                {actionLoading ? <Loader2 size={16} className="animate-spin" /> : `Execute Winner Draw`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draw Results Modal */}
      {drawResults && (
        <div className={styles.modalBackdrop} onClick={() => setDrawResults(null)}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Winner Draw Results</h3>
              <p className={styles.modalSubtitle}>
                Run ID: <span className={styles.monoTxn}>{drawResults.drawRunId}</span> · New Winners: {drawResults.totalNewWinners}
              </p>
            </div>

            <div className={styles.drawResultGrid}>
              {drawResults.results?.map((res, idx) => (
                <div key={idx} className={styles.drawResultCard}>
                  <div className={styles.drawResultHeader}>
                    <span className={styles.drawPrizeName}>{res.prizeName}</span>
                    {res.status === 'SUCCESS' && <span className={styles.winnerChip}>SUCCESS ({res.winnerCount})</span>}
                    {res.status === 'ALREADY_DRAWN' && <span className={styles.winnerChip}>ALREADY DRAWN ({res.winnerCount})</span>}
                    {res.status === 'SKIPPED_PENDING_CONFIRMATION' && (
                      <span className={styles.drawPendingChip}>SKIPPED PENDING</span>
                    )}
                    {res.status === 'FAILED_INSUFFICIENT_PARTICIPANTS' && (
                      <span className={styles.drawFailedChip}>INSUFFICIENT USERS ({res.available}/{res.required})</span>
                    )}
                  </div>
                  <p className={styles.subText}>{res.message}</p>
                  {res.winners?.length > 0 && (
                    <div className={styles.drawWinnersList}>
                      {res.winners.map((w, wIdx) => (
                        <span key={wIdx} className={styles.winnerChip}>
                          🏆 {w.maskedUserId}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className={styles.modalActions}>
              <button className="btn-veloop-gold" onClick={() => setDrawResults(null)}>
                Close Results
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Process Claim Modal */}
      {claimModal.open && (
        <div className={styles.modalBackdrop} onClick={() => setClaimModal({ ...claimModal, open: false })}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Process Prize Fulfillment</h3>
              <p className={styles.modalSubtitle}>
                Claim ID: <span className={styles.monoTxn}>{claimModal.claim?.claimId}</span> ({claimModal.claim?.prizeName})
              </p>
            </div>

            <form onSubmit={submitProcessClaim}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Target Claim Status</label>
                <select
                  className={styles.formSelect}
                  value={claimModal.status}
                  onChange={(e) => setClaimModal({ ...claimModal, status: e.target.value })}
                >
                  <option value="PROCESSING">PROCESSING (Verification in Progress)</option>
                  <option value="COMPLETED">COMPLETED (Fulfilled & Dispatched)</option>
                </select>
              </div>

              {claimModal.claim?.claimType === 'PHYSICAL' ? (
                <>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Courier Partner</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={claimModal.courierPartner}
                      onChange={(e) => setClaimModal({ ...claimModal, courierPartner: e.target.value })}
                      placeholder="e.g. BlueDart Express Air"
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Tracking Number / AWB</label>
                    <input
                      type="text"
                      className={styles.formInput}
                      value={claimModal.trackingNumber}
                      onChange={(e) => setClaimModal({ ...claimModal, trackingNumber: e.target.value })}
                      placeholder="e.g. BLUEDART-IND-9948271"
                      required={claimModal.status === 'COMPLETED'}
                    />
                  </div>
                </>
              ) : (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Gift Card Voucher Code</label>
                  <input
                    type="text"
                    className={styles.formInput}
                    value={claimModal.voucherCode}
                    onChange={(e) => setClaimModal({ ...claimModal, voucherCode: e.target.value })}
                    placeholder="e.g. AMZ-PROMO-2026-WINNER"
                    required={claimModal.status === 'COMPLETED'}
                  />
                </div>
              )}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Admin Notes (Optional)</label>
                <textarea
                  className={styles.formTextarea}
                  value={claimModal.notes}
                  onChange={(e) => setClaimModal({ ...claimModal, notes: e.target.value })}
                  placeholder="Internal fulfillment remarks..."
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className="btn-veloop-secondary"
                  onClick={() => setClaimModal({ ...claimModal, open: false })}
                  disabled={actionLoading}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-veloop-gold" disabled={actionLoading}>
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : `Save & Update Claim`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
