import {PortalShell} from '@/components/portal/portal-shell';
import {EmployeeForm} from '@/components/portal/employee-form';

export default function AddEmployeePage() {
  return (
    <PortalShell>
      <EmployeeForm mode="add" />
    </PortalShell>
  );
}
