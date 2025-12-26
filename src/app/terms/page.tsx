export default function TermsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Terms of Service</h1>
        <p className="opacity-80">These are basic v1 terms for PanelFlow. Replace with legal-reviewed terms before a large public launch.</p>
        <h2 className="text-lg font-semibold mt-4">Content & Rights</h2>
        <ul className="list-disc pl-6 opacity-80 space-y-2">
          <li>You may upload only content you own or have permission to use.</li>
          <li>You are responsible for what you publish and share.</li>
          <li>We may remove content that violates laws or these terms.</li>
        </ul>
        <h2 className="text-lg font-semibold mt-4">Subscriptions</h2>
        <ul className="list-disc pl-6 opacity-80 space-y-2">
          <li>Payments are processed by Stripe. We do not store card details.</li>
          <li>Pro features may change over time as the product evolves.</li>
          <li>You can manage or cancel your subscription through the billing portal.</li>
        </ul>
        <h2 className="text-lg font-semibold mt-4">Availability</h2>
        <ul className="list-disc pl-6 opacity-80 space-y-2">
          <li>We aim to keep the service reliable, but downtime can happen.</li>
          <li>PanelFlow is provided “as is” without warranties to the maximum extent permitted by law.</li>
        </ul>
        <p className="text-sm opacity-70 pt-4">Last updated: {new Date().toISOString().slice(0, 10)}</p>
      </div>
    </div>
  );
}
