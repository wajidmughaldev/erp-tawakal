import {PortalShell} from '@/components/portal/portal-shell';
import {EmployeeForm} from '@/components/portal/employee-form';

export default function EditEmployeePage() {
  return (
    <PortalShell>
      <EmployeeForm mode="edit" />
    </PortalShell>
  );
}
