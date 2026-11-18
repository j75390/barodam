import { lazy, Suspense, useCallback, useState } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { Rail, ScrollReset, ScrollTopButton, TabBar } from '@/components/Chrome';
import Home from '@/pages/Home';
import { CartContext } from '@/state/cartDrawer';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Code-split everything except the home page.
const Product = lazy(() => import('@/pages/Product'));
const Results = lazy(() => import('@/pages/Results'));
const Ranking = lazy(() => import('@/pages/Ranking'));
const Brands = lazy(() => import('@/pages/Brands'));
const Brand = lazy(() => import('@/pages/Brand'));
const Login = lazy(() => import('@/pages/auth/Login'));
const Signup = lazy(() => import('@/pages/auth/Signup'));
const Find = lazy(() => import('@/pages/auth/Find'));
const Checkout = lazy(() => import('@/pages/order/Checkout'));
const GuestCheckout = lazy(() => import('@/pages/order/GuestCheckout'));
const OrderComplete = lazy(() => import('@/pages/order/OrderComplete'));
const OrderDetail = lazy(() => import('@/pages/order/OrderDetail'));
const GuestOrder = lazy(() => import('@/pages/order/GuestOrder'));
const MyPage = lazy(() => import('@/pages/mypage/MyPage'));
const Info = lazy(() => import('@/pages/Info'));
const NotFound = lazy(() => import('@/pages/NotFound'));
const HelpApp = lazy(() => import('@/pages/help/HelpApp'));
const CareersApp = lazy(() => import('@/pages/careers/CareersApp'));
const AdminApp = lazy(() => import('@/pages/admin/AdminApp'));

function Loading() {
  return <div className="page-loading" aria-busy="true"><div className="spin" /></div>;
}

/** Shop chrome: header, footer, rails, cart drawer. */
function ShopLayout() {
  const [cartOpen, setCartOpen] = useState(false);
  const loc = useLocation();
  const focused = /^\/(login|signup|find)/.test(loc.pathname);
  const openCart = useCallback(() => setCartOpen(true), []);
  const closeCart = useCallback(() => setCartOpen(false), []);
  return (
    <CartContext.Provider value={openCart}>
      <div className={focused ? 'authm' : undefined}>
        <Header onOpenCart={openCart} />
        <ErrorBoundary key={loc.pathname}>
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
        <Footer />
        <Rail />
        <ScrollTopButton />
        <TabBar />
        {cartOpen && <CartDrawer onClose={closeCart} />}
      </div>
    </CartContext.Provider>
  );
}

export default function App() {
  return (
    <>
      <ScrollReset />
      <Routes>
        <Route element={<ShopLayout />}>
          <Route index element={<Home />} />
          <Route path="products/:id" element={<Product />} />
          <Route path="search" element={<Results mode="search" />} />
          <Route path="category/:cat" element={<Results mode="category" />} />
          <Route path="ranking" element={<Ranking />} />
          <Route path="brands" element={<Brands />} />
          <Route path="brands/:name" element={<Brand />} />
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="find/:tab?" element={<Find />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="checkout/guest" element={<GuestCheckout />} />
          <Route path="orders/complete/:no" element={<OrderComplete />} />
          <Route path="orders/:no" element={<OrderDetail />} />
          <Route path="guest-orders/:no" element={<GuestOrder />} />
          <Route path="mypage/:tab?/:sub?" element={<MyPage />} />
          <Route path="info/:key" element={<Info />} />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route path="help/*" element={<Suspense fallback={<Loading />}><HelpApp /></Suspense>} />
        <Route path="careers/*" element={<Suspense fallback={<Loading />}><CareersApp /></Suspense>} />
        <Route path="admin/*" element={<Suspense fallback={<Loading />}><AdminApp /></Suspense>} />
        <Route path="index.html" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
