import { PaymentsTracker } from "./PaymentsTracker";

export function AccountantDashboard() {
  return (
    <div className="grid gap-6 p-6 grid-cols-1 lg:grid-cols-2">
      <PaymentsTracker />
    </div>
  );
}
