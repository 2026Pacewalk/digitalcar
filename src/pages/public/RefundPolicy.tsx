export default function RefundPolicy() {
  return (
    <div className="pt-24 pb-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] mb-4">Legal</span>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#0F172A]">Refund Policy</h1>
          <p className="mt-3 text-sm text-[#94A3B8]">Last updated: May 8, 2026</p>
        </div>

        <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-premium border border-[#F1F5F9] space-y-8">
          <section>
            <h2 className="text-lg font-semibold text-[#0F172A] mb-3">1. Overview</h2>
            <p className="text-sm text-[#64748B] leading-relaxed">
              At DigitalCarda, we strive to provide the best digital business card platform. If you are not satisfied with our service, we offer a refund policy as described below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A] mb-3">2. Free Trial</h2>
            <p className="text-sm text-[#64748B] leading-relaxed">
              All new users are eligible for a 7-day free trial. No payment information is required to start the trial. You can cancel anytime during the trial period without any charge.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A] mb-3">3. Refund Eligibility</h2>
            <div className="space-y-2 text-sm text-[#64748B] leading-relaxed">
              <p><strong className="text-[#0F172A]">7-Day Money-Back Guarantee:</strong> If you are not satisfied with our paid plans, you can request a full refund within 7 days of your initial purchase.</p>
              <p><strong className="text-[#0F172A]">No Refund After 7 Days:</strong> Refund requests submitted after 7 days from the purchase date will not be eligible for a refund.</p>
              <p><strong className="text-[#0F172A]">Renewals:</strong> Subscription renewals are not eligible for refunds. Please cancel before the renewal date if you do not wish to continue.</p>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A] mb-3">4. How to Request a Refund</h2>
            <p className="text-sm text-[#64748B] leading-relaxed">
              To request a refund, contact our support team at support@digitalcarda.com with your account email and purchase details. Refunds are processed within 5-7 business days to the original payment method.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A] mb-3">5. Exceptions</h2>
            <p className="text-sm text-[#64748B] leading-relaxed">
              Refunds may not be granted in cases of violation of our Terms of Service, fraudulent activity, or abuse of the platform. Custom enterprise agreements may have different refund terms as specified in the contract.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0F172A] mb-3">6. Contact Us</h2>
            <p className="text-sm text-[#64748B] leading-relaxed">
              For any refund-related queries, please contact us at support@digitalcarda.com or call +91 98765 43210.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
