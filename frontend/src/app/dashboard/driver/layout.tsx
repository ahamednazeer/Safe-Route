import DashboardLayout from '@/components/DashboardLayout';

export default function DriverDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayout>{children}</DashboardLayout>;
}
