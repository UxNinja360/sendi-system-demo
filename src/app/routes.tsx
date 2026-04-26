import { createBrowserRouter, Navigate } from 'react-router';
import { AppLayout } from './components/layout/app-layout';
import { LoginPage } from './pages/login-page';
import { NotFoundPage } from './pages/not-found-page';
import { Dashboard } from './pages/dashboard';
import { WalletPage } from './pages/wallet-page';
import { LiveManager } from './pages/live-manager';
import { DeliveriesPage } from './pages/deliveries-page';
import { DispatchLabPage } from './pages/dispatch-lab-page';
import { ExceptionsLabPage } from './pages/exceptions-lab-page';
import { ReportsPage } from './pages/reports-page';
import { PerformancePage } from './pages/performance-page';
import { LogPage } from './pages/log-page';
import { DeliveryBalancePage } from './pages/delivery-balance-page';
import { CouriersPage } from './pages/couriers-page';
import { CouriersListPage } from './pages/couriers-list-page';
import { RestaurantsPage } from './pages/restaurants-page';
import { CustomersPage } from './pages/customers-page';
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
import { getNavItemById } from './app-navigation';

const routePath = (id: string) => getNavItemById(id)?.routePath ?? id;

export const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <ThemeProvider>
        <LoginPage />
      </ThemeProvider>
    ),
  },
  {
    path: '/',
    element: (
      <ThemeProvider>
        <DeliveryProvider>
          <AppLayout />
        </DeliveryProvider>
      </ThemeProvider>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      // === Core ===
      {
        path: routePath('dashboard'),
        element: <Dashboard />,
      },
      {
        path: routePath('live'),
        element: <LiveManager />,
      },
      // === Data ===
      {
        path: routePath('deliveries'),
        element: <DeliveriesPage />,
      },
      {
        path: routePath('dispatch'),
        element: <DispatchLabPage />,
      },
      {
        path: routePath('exceptions'),
        element: <ExceptionsLabPage />,
      },
      {
        path: routePath('reports'),
        element: <ReportsPage />,
      },
      {
        path: routePath('performance'),
        element: <PerformancePage />,
      },
      {
        path: routePath('log'),
        element: <LogPage />,
      },
      {
        path: routePath('delivery-balance'),
        element: <DeliveryBalancePage />,
      },
      {
        path: routePath('wallet'),
        element: <WalletPage />,
      },
      // === Entities ===
      {
        path: routePath('couriers'),
        element: <CouriersListPage />,
      },
      {
        path: routePath('courier-shifts'),
        element: <CouriersPage />,
      },
      {
        path: routePath('restaurants'),
        element: <RestaurantsPage />,
      },
      {
        path: routePath('customers'),
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
      // === Settings ===
      {
        path: routePath('settings'),
        element: <SettingsPage />,
      },
      {
        path: routePath('hours'),
        element: <OperatingHoursPage />,
      },
      {
        path: routePath('zones'),
        element: <DeliveryZonesPage />,
      },
      {
        path: routePath('distance-pricing'),
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
