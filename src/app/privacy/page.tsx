export default function PrivacyPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-semibold">Privacy Policy</h1>
        <p className="opacity-80">
          This is a basic v1 privacy policy for PanelFlow. Replace with a legal-reviewed policy before a large public launch.
        </p>

        <h2 className="text-lg font-semibold mt-4">What we collect</h2>
        <ul className="list-disc pl-6 opacity-80 space-y-2">
          <li>Account details such as your email address.</li>
          <li>Content you upload (series, chapters, and page images).</li>
          <li>Basic usage analytics (if enabled).</li>
        </ul>

        <h2 className="text-lg font-semibold mt-4">Payments</h2>
        <ul className="list-disc pl-6 opacity-80 space-y-2">
          <li>Payments are processed by Stripe.</li>
          <li>We do not store your card details.</li>
        </ul>

        <h2 className="text-lg font-semibold mt-4">Data requests</h2>
        <ul className="list-disc pl-6 opacity-80 space-y-2">
          <li>You can request deletion of your account and content.</li>
        </ul>

        <p className="text-sm opacity-70 pt-4">Last updated: {new Date().toISOString().slice(0, 10)}</p>
      </div>
    </div>
  );
}
