import { BrowserRouter, Route, Routes, useLocation, Navigate } from 'react-router-dom';
import Providers from '@/components/Providers';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import LandingPage from '@/app/landing/page';
import SwapPage from '@/app/page';
import ActivityPage from '@/app/activity/page';
import ProfilePage from '@/app/profile/page';
import PoolsPage from '@/app/pools/page';
import CreatePoolPage from '@/app/pools/create/page';
import PoolDetailsPage from '@/app/pools/[id]/page';
import PositionDetailsPage from '@/app/positions/[id]/page';
import CreatePositionPage from '@/app/positions/create/[params]/page';
import CampaignsPage from '@/app/campaigns/page';
import CreateCampaignPage from '@/app/campaigns/create/page';
import CampaignDetailPage from '@/app/campaigns/[id]/page';
import BannersPage from '@/app/banners/page';
import FaucetPage from '@/app/faucet/page';

import MobileBottomNav from '@/components/MobileBottomNav';

function RootRoute() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  if (searchParams.has('from') || searchParams.has('to') || searchParams.has('poolId')) {
    return <Navigate to={`/swap${location.search}`} replace />;
  }
  return <LandingPage />;
}

function MainLayout() {
  const location = useLocation();
  const isSwap = location.pathname === '/swap';
  const isLanding = location.pathname === '/' || location.pathname === '/landing';

  return (
    <div className="flex flex-col min-h-screen bg-[#080808] text-bone grain">
      <Navbar />
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route
          path="/*"
          element={
            <main className="flex-1 pt-16 sm:pt-20 flex flex-col">
              <div
                className={`w-full mx-auto px-3.5 sm:px-6 md:px-8 flex-1 flex flex-col ${
                  isSwap
                    ? 'max-w-5xl items-center justify-center py-6 sm:py-10 pb-24 md:pb-10'
                    : 'max-w-6xl pt-4 sm:pt-6 pb-28 md:pb-20'
                }`}
              >
                <Routes>
                  <Route path="/swap" element={<SwapPage />} />
                  <Route path="/activity" element={<ActivityPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/pools" element={<PoolsPage />} />
                  <Route path="/pools/create" element={<CreatePoolPage />} />
                  <Route path="/pools/:id" element={<PoolDetailsPage />} />
                  <Route path="/positions/:id" element={<PositionDetailsPage />} />
                  <Route path="/positions/create/:params" element={<CreatePositionPage />} />
                  <Route path="/positions/create" element={<CreatePositionPage />} />
                  <Route path="/campaigns" element={<CampaignsPage />} />
                  <Route path="/campaigns/create" element={<CreateCampaignPage />} />
                  <Route path="/campaigns/:id" element={<CampaignDetailPage />} />
                  <Route path="/banners" element={<BannersPage />} />
                  <Route path="/faucet" element={<FaucetPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
          }
        />
      </Routes>
      <div className={isLanding ? 'block' : 'hidden md:block'}>
        <Footer />
      </div>
      {!isLanding && <MobileBottomNav />}
    </div>
  );
}

export default function App() {
  return (
    <Providers>
      <BrowserRouter>
        <MainLayout />
      </BrowserRouter>
    </Providers>
  );
}
