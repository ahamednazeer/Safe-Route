import DashboardLayout from '@/components/DashboardLayout';

export default function EmployeeDashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <DashboardLayout>{children}</DashboardLayout>;
}
