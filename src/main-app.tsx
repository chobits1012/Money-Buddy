import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import Layout from './components/layout/Layout';
import App from './App';
import { BackupPage } from './pages/BackupPage';
import { HoldingsRoutePage } from './pages/HoldingsRoutePage';
import { SyncProvider } from './contexts/SyncContext';
import './index.css';

const router = createBrowserRouter([
    {
        path: '/',
        element: <Layout />,
        children: [
            {
                index: true,
                element: <App />,
            },
            {
                path: 'backup',
                element: <BackupPage />,
            },
            {
                path: 'holdings/:market',
                element: <HoldingsRoutePage />,
            },
        ],
    },
]);

export function renderApp() {
    ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
        <React.StrictMode>
            <SyncProvider>
                <RouterProvider router={router} />
            </SyncProvider>
        </React.StrictMode>
    );
}
