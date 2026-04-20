import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './components/layout/app-layout';
import { LoginPage } from './components/pages/login-page';
import { NotFoundPage } from './components/pages/not-found-page';
import { Dashboard } from './components/pages/dashboard';
import { PayoutsPage } from './components/pages/finance/payouts-page';
import { WalletPage } from './components/pages/finance/wallet-page';
import { LiveManager } from './components/pages/live-manager';
import { LiveManagerPage } from './components/pages/live-manager-page';
import { BusinessManagement } from './components/pages/business-management';
import { DeliveriesPage } from './components/pages/deliveries-page';
import { AdminMode } from './components/pages/admin-mode';
import { ReportsPage } from './components/pages/reports-page';
import { PerformancePage } from './components/pages/performance-page';
import { LogPage } from './components/pages/log-page';
import { FinancesPage } from './components/pages/finances-page';
import { TrackingPage } from './components/pages/tracking-page';
import { CouriersPage } from './components/pages/entities/couriers-page';
import { CouriersListPage } from './components/pages/entities/couriers-list-page';
import { RestaurantsPage } from './components/pages/entities/restaurants-page';
import { CustomersPage } from './components/pages/entities/customers-page';
import { ManagersPage } from './components/pages/entities/managers-page';
import { DeliveryDetailsPage } from './components/pages/delivery-details-page';
import { RestaurantDetailsPage } from './components/pages/restaurant-details-page';
import { CourierDetailsPage } from './components/pages/courier-details-page';
import { CustomerDetailsPage } from './components/pages/customer-details-page';
import { SettingsPage } from './components/pages/settings-page';
import { OperatingHoursPage } from './components/pages/operating-hours-page';
import { DeliveryZonesPage } from './components/pages/delivery-zones-page';
import { DistancePricingPage } from './components/pages/distance-pricing-page';
import { DeliveryProvider } from './context/delivery.context';
import { ThemeProvider } from './context/theme.context';
import { LanguageProvider } from './context/language.context';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <LanguageProvider>
        <ThemeProvider>
          <LoginPage />
        </ThemeProvider>
      </LanguageProvider>
    ),
  },
  {
    path: '/',
    element: (
      <LanguageProvider>
        <ThemeProvider>
          <DeliveryProvider>
            <AppLayout />
          </DeliveryProvider>
        </ThemeProvider>
      </LanguageProvider>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      // === Core ===
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'live',
        element: <LiveManager />,
      },
      {
        path: 'tracking',
        element: <TrackingPage />,
      },
      // === Data ===
      {
        path: 'deliveries',
        element: <DeliveriesPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'performance',
        element: <PerformancePage />,
      },
      {
        path: 'log',
        element: <LogPage />,
      },
      {
        path: 'finances',
        element: <FinancesPage />,
      },
      {
        path: 'wallet',
        element: <WalletPage />,
      },
      // === Entities ===
      {
        path: 'couriers',
        element: <CouriersListPage />,
      },
      {
        path: 'couriers/shifts',
        element: <CouriersPage />,
      },
      {
        path: 'restaurants',
        element: <RestaurantsPage />,
      },
      {
        path: 'customers',
        element: <CustomersPage />,
      },
      // === Entity Details ===
      {
        path: 'delivery/:deliveryId',
        element: <DeliveryDetailsPage />,
      },
      {
        path: 'restaurant/:restaurantId',
        element: <RestaurantDetailsPage />,
      },
      {
        path: 'courier/:courierId',
        element: <CourierDetailsPage />,
      },
      {
        path: 'customer/:customerId',
        element: <CustomerDetailsPage />,
      },
      // === Business & Finance ===
      {
        path: 'business/:tab?',
        element: <BusinessManagement />,
      },
      {
        path: 'settings/payouts',
        element: <PayoutsPage />,
      },
      // === Settings ===
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'settings/hours',
        element: <OperatingHoursPage />,
      },
      {
        path: 'settings/zones',
        element: <DeliveryZonesPage />,
      },
      {
        path: 'settings/distance-pricing',
        element: <DistancePricingPage />,
      },
      {
        path: 'settings/managers',
        element: <ManagersPage />,
      },

      // === Admin ===
      {
        path: 'admin',
        element: <AdminMode />,
      },
      // === Catch-all ===
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
