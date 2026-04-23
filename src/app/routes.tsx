import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './components/layout/app-layout';
import { LoginPage } from './pages/login-page';
import { NotFoundPage } from './pages/not-found-page';
import { Dashboard } from './pages/dashboard';
import { PayoutsPage } from './pages/finance/payouts-page';
import { WalletPage } from './pages/finance/wallet-page';
import { LiveManager } from './pages/live-manager';
import { DeliveriesPage } from './pages/deliveries-page';
import { ReportsPage } from './pages/reports-page';
import { PerformancePage } from './pages/performance-page';
import { LogPage } from './pages/log-page';
import { FinancesPage } from './pages/finances-page';
import { CouriersPage } from './pages/entities/couriers-page';
import { CouriersListPage } from './pages/entities/couriers-list-page';
import { RestaurantsPage } from './pages/entities/restaurants-page';
import { CustomersPage } from './pages/entities/customers-page';
import { DeliveryDetailsPage } from './pages/delivery-details-page';
import { RestaurantDetailsPage } from './pages/restaurant-details-page';
import { CourierDetailsPage } from './pages/courier-details-page';
import { CustomerDetailsPage } from './pages/customer-details-page';
import { SettingsPage } from './pages/settings-page';
import { OperatingHoursPage } from './pages/operating-hours-page';
import { DeliveryZonesPage } from './pages/delivery-zones-page';
import { DistancePricingPage } from './pages/distance-pricing-page';
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
        path: 'settings/payouts',
        element: <PayoutsPage />,
      },
      // === Settings ===
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'hours',
        element: <OperatingHoursPage />,
      },
      {
        path: 'zones',
        element: <DeliveryZonesPage />,
      },
      {
        path: 'distance-pricing',
        element: <DistancePricingPage />,
      },

      // === Catch-all ===
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]);
