import { PaymentsTracker } from "./PaymentsTracker";

export function AccountantDashboard() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <PaymentsTracker />
    </div>
  );
}
