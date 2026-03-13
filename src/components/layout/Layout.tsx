import { Outlet } from 'react-router-dom';

export default function Layout() {
    return (
        <div className="min-h-screen bg-background text-textPrimary flex flex-col items-center concrete-bg">
            {/* 寬度限制，確保在電腦或手機都有良好的視覺比例 */}
            <main className="w-full max-w-md flex-1 flex flex-col relative px-4 py-8 pb-24 sm:px-6">
                <header className="mb-8 flex justify-between items-center">
                    <h1 className="text-xl font-light tracking-widest uppercase text-clay">
                        資產控管中心
                    </h1>
                </header>

                {/* React Router 渲染區 */}
                <Outlet />
            </main>
        </div>
    );
}
