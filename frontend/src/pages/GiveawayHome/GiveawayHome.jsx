import React, { useState, useEffect } from 'react';
import { getCurrentGiveaway, getPreviousGiveaways, getAllPreviousWinners, getMyGiveawayStatus } from '../../services/giveawayApi.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { CustomLoader } from '../../components/CustomLoader/CustomLoader.jsx';
import { GiveawayHero } from '../../components/GiveawayHero/GiveawayHero.jsx';
import { GiveawayStats } from '../../components/GiveawayStats/GiveawayStats.jsx';
import { WinnerAnnouncementSlider } from '../../components/WinnerAnnouncementSlider/WinnerAnnouncementSlider.jsx';
import { PersonalizedRewardPass } from '../../components/PersonalizedRewardPass/PersonalizedRewardPass.jsx';
import { PrizeCard } from '../../components/PrizeCard/PrizeCard.jsx';
import { HowToParticipate } from '../../components/HowToParticipate/HowToParticipate.jsx';
import { WinnersTabs } from '../../components/WinnersTabs/WinnersTabs.jsx';
import { TrustSection } from '../../components/TrustSection/TrustSection.jsx';
import { GiveawayRules } from '../../components/GiveawayRules/GiveawayRules.jsx';
import { FAQ } from '../../components/FAQ/FAQ.jsx';
import { PrizeClaimModal } from '../../components/PrizeClaimModal/PrizeClaimModal.jsx';
import { Sparkles, Trophy, AlertTriangle, RefreshCw } from 'lucide-react';
import styles from './GiveawayHome.module.css';

export const GiveawayHome = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [previousGiveaways, setPreviousGiveaways] = useState([]);
  const [previousWinners, setPreviousWinners] = useState([]);
  const [userStatus, setUserStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Claim modal state
  const [selectedWinnerRecord, setSelectedWinnerRecord] = useState(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);

  const fetchHomeData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [currentRes, prevRes, prevWinnersRes] = await Promise.all([
        getCurrentGiveaway(),
        getPreviousGiveaways(),
        getAllPreviousWinners(),
      ]);

      if (currentRes.success) {
        setData(currentRes);
      }
      if (prevRes.success) {
        setPreviousGiveaways(prevRes.giveaways || []);
      }
      if (prevWinnersRes.success) {
        setPreviousWinners(prevWinnersRes.winners || []);
      }

      // If user logged in, fetch personal status
      if (user && currentRes.giveaway) {
        try {
          const statusRes = await getMyGiveawayStatus(currentRes.giveaway.giveawayId);
          if (statusRes.success) {
            setUserStatus(statusRes);
          }
        } catch (e) {
          // ignore status fetch error
        }
      }
    } catch (err) {
      console.error('Failed to load giveaway data:', err);
      setError(err.message || 'Unable to connect to VELOOP backend server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHomeData();
  }, [user]);

  const scrollToPrizes = () => {
    const el = document.getElementById('featured-prizes');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleOpenClaim = (winnerRecord) => {
    setSelectedWinnerRecord(winnerRecord);
    setClaimModalOpen(true);
  };

  if (loading) {
    return <CustomLoader message="Unlocking VELOOP Rewards Megadraw..." />;
  }

  if (error) {
    return (
      <div className={`veloop-container ${styles.errorContainer}`}>
        <div className={styles.errorBox}>
          <AlertTriangle size={36} className={styles.errorIcon} />
          <h3 className={styles.errorTitle}>Unable to Load Giveaway Information</h3>
          <p className={styles.errorDesc}>{error}</p>
          <button className="btn-veloop-primary" onClick={fetchHomeData}>
            <RefreshCw size={16} />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  const giveaway = data?.giveaway;
  const prizes = giveaway?.prizes || [];

  return (
    <div className={styles.pageWrapper}>
      {/* 1. Hero Section */}
      <GiveawayHero giveaway={giveaway} onExploreClick={scrollToPrizes} />

      {/* 2. Winner Announcement Slider Ticker */}
      <div className="veloop-container">
        <WinnerAnnouncementSlider announcements={giveaway?.winnerAnnouncements || []} />
      </div>

      {/* 3. Giveaway Statistics */}
      <GiveawayStats stats={data?.stats} endAt={giveaway?.endAt} />

      {/* 4. Personalized Reward Pass */}
      <div className="veloop-container">
        <PersonalizedRewardPass
          totalEntries={userStatus?.isParticipating ? 1 : 0}
          isUserParticipating={userStatus?.isParticipating}
        />
      </div>

      {/* 5. Featured Prizes Grid */}
      <section className={styles.prizesSection} id="featured-prizes">
        <div className={`veloop-container ${styles.prizesContainer}`}>
          <div className={styles.prizesHeader}>
            <div>
              <div className={styles.prizesBadge}>
                <Sparkles size={14} />
                <span>ACTIVE REWARD INVENTORY</span>
              </div>
              <h2 className={styles.prizesTitle}>Featured Giveaway Prizes</h2>
              <p className={styles.prizesSubtitle}>
                Select a prize to review technical specifications, entry currency requirements, and participate.
              </p>
            </div>
            <span className={styles.prizeCountBadge}>{prizes.length} Prizes Available</span>
          </div>

          <div className={styles.prizesGrid}>
            {prizes.map((prize) => (
              <PrizeCard
                key={prize._id || prize.prizeId}
                prize={prize}
                giveawayStatus={giveaway?.status}
                endAt={giveaway?.endAt}
              />
            ))}
          </div>
        </div>
      </section>

      {/* 6. How To Participate */}
      <HowToParticipate />

      {/* 7. Winners & Previous Winners Tabbed Section */}
      <WinnersTabs
        currentGiveaway={giveaway}
        currentWinners={[]}
        previousGiveaways={previousGiveaways}
        previousWinners={previousWinners}
        onOpenClaimModal={handleOpenClaim}
      />

      {/* 8. Trust & Fair Play Section */}
      <TrustSection />

      {/* 9. Official Rules & Guidelines */}
      <GiveawayRules rules={giveaway?.rules} />

      {/* 10. FAQ Section */}
      <FAQ faqList={giveaway?.faq} />

      {/* Prize Claim Modal (If triggered) */}
      <PrizeClaimModal
        isOpen={claimModalOpen}
        onClose={() => setClaimModalOpen(false)}
        winnerRecord={selectedWinnerRecord}
        onClaimSubmitted={() => fetchHomeData()}
      />
    </div>
  );
};
