"use client";

import Link from "next/link";
import { useState } from "react";
import {
  discoveryOptions, initialMembershipDraft, membershipCost,
  membershipOptions, officialMembershipUrl, validateMembershipDraft,
  type CommunityChannel, type MembershipDraft, type SelectableMembership,
} from "@/features/membership/preview";
import { displayMoney } from "@/features/commerce/cart";

const communityChannels: ReadonlyArray<{ id: CommunityChannel; label: string }> = [
  { id: "whatsapp", label: "WhatsApp Community" },
  { id: "discord", label: "Discord Server" },
];
const coopChannels: ReadonlyArray<{ id: CommunityChannel; label: string }> = [
  ...communityChannels, { id: "already_member", label: "I am already in the community" },
];

function amountLabel(minor: number): string {
  return displayMoney(minor, "GBP");
}

export function MembershipPlanner() {
  const [draft, setDraft] = useState<MembershipDraft>(initialMembershipDraft);
  const [reviewing, setReviewing] = useState(false);
  const coop = draft.kind !== "community";
  const cost = membershipCost(draft.kind, draft.quarterlyPounds);
  const valid = validateMembershipDraft(draft).length === 0;

  function change<K extends keyof MembershipDraft>(key: K, value: MembershipDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setReviewing(false);
  }
  function chooseKind(kind: SelectableMembership) {
    setDraft((current) => ({ ...current, kind }));
    setReviewing(false);
  }
  function toggleChannel(channel: CommunityChannel, checked: boolean) {
    change("channels", checked
      ? [...draft.channels.filter((item) => item !== channel), channel]
      : draft.channels.filter((item) => item !== channel));
  }

  return <div className="membership-planner">
    <div className="membership-intro">
      <p className="commerce-eyebrow">Community and co-operative</p>
      <h1>Find your membership</h1>
      <p>Choose the way you would like to participate in Empress Immersive. Membership applications are still processed through the existing website while this rebuild is being prepared.</p>
    </div>

    <section className="membership-section" aria-label="Membership options">
      <div className="membership-section-title"><span>01</span><h2>Choose a membership</h2></div>
      <div className="membership-options" role="group" aria-label="Membership types">
        {membershipOptions.map((option) => (
          <article className={"membership-option" + (draft.kind === option.kind && option.selectable ? " is-selected" : "")}
            key={option.kind}>
            <div className="membership-option-heading">
              <h3>{option.title}</h3>
              {draft.kind === option.kind && option.selectable ? <span className="membership-selected">Selected</span> : null}
            </div>
            <p>{option.description}</p>
            <strong>{option.priceLabel}</strong>
            <small>{option.note}</small>
            {option.selectable ? (
              <button type="button" className="membership-select"
                aria-pressed={draft.kind === option.kind}
                onClick={() => chooseKind(option.kind as SelectableMembership)}>
                {draft.kind === option.kind ? "Selected" : "Choose " + option.title}
              </button>
            ) : <span className="membership-unavailable">Not available to apply</span>}
          </article>
        ))}
      </div>
    </section>

    <div className="membership-workspace">
      <div className="membership-form-panel">
        <section aria-label="Membership application preview">
          <div className="membership-section-title"><span>02</span><h2>Application details</h2></div>
          <p className="membership-small-note">This is a preview. Information entered here stays in this page and is not submitted or saved to a database.</p>

          {draft.kind === "user" ? (
            <div className="membership-quarterly">
              <label htmlFor="membership-quarterly">Quarterly contribution: <strong>{amountLabel(draft.quarterlyPounds * 100)}</strong></label>
              <input id="membership-quarterly" type="range" min="13" max="52" step="1"
                value={draft.quarterlyPounds}
                onChange={(event) => change("quarterlyPounds", Number(event.target.value))}/>
              <div><span>£13</span><span>£52</span></div>
              <p>Indicative sliding-scale contribution from the current site. The final plan and fees must be confirmed before payment can be enabled.</p>
            </div>
          ) : null}

          {reviewing ? <div className="membership-review" aria-live="polite">
            <h3>Review your application</h3>
            <p>These details have not been sent to EmpressVR.</p>
            <dl>
              <div><dt>Membership</dt><dd>{membershipOptions.find((item) => item.kind === draft.kind)?.title}</dd></div>
              <div><dt>Name</dt><dd>{draft.firstName.trim()} {draft.lastName.trim()}</dd></div>
              <div><dt>Email</dt><dd>{draft.email.trim()}</dd></div>
              <div><dt>Country</dt><dd>{draft.country.trim()}</dd></div>
              {draft.channels.length ? <div><dt>Community</dt><dd>{draft.channels.map((channel) =>
                coopChannels.find((item) => item.id === channel)?.label).join(", ")}</dd></div> : null}
            </dl>
            <div className="membership-review-actions">
              <button type="button" className="outline-button" onClick={() => setReviewing(false)}>Edit details</button>
            </div>
          </div> : (
            <form className="membership-form" onSubmit={(event) => { event.preventDefault(); }}>
              <div className="membership-form-grid">
                <label>First name <span aria-hidden="true">*</span>
                  <input aria-label="First name" required autoComplete="given-name" maxLength={100}
                    value={draft.firstName} onChange={(event) => change("firstName", event.target.value)}/>
                </label>
                <label>Last name <span aria-hidden="true">*</span>
                  <input aria-label="Last name" required autoComplete="family-name" maxLength={100}
                    value={draft.lastName} onChange={(event) => change("lastName", event.target.value)}/>
                </label>
                <label>Email <span aria-hidden="true">*</span>
                  <input aria-label="Email" required type="email" autoComplete="email" maxLength={254}
                    value={draft.email} onChange={(event) => change("email", event.target.value)}/>
                </label>
                <label>Phone (optional)
                  <input aria-label="Phone" type="tel" autoComplete="tel" maxLength={40}
                    value={draft.phone} onChange={(event) => change("phone", event.target.value)}/>
                </label>
                <label>Country of residence <span aria-hidden="true">*</span>
                  <input aria-label="Country of residence" required autoComplete="country-name" maxLength={100}
                    value={draft.country} onChange={(event) => change("country", event.target.value)}/>
                </label>
                <label>How did you hear about us? <span aria-hidden="true">*</span>
                  <select aria-label="How did you hear about us?" required value={draft.discovery}
                    onChange={(event) => change("discovery", event.target.value as MembershipDraft["discovery"])}>
                    <option value="">Select an option</option>
                    {discoveryOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              </div>
              <fieldset className="membership-fieldset">
                <legend>Which community would you like to join? (optional)</legend>
                <div className="membership-checks">
                  {(coop ? coopChannels : communityChannels).map((channel) => <label key={channel.id}>
                    <input type="checkbox" checked={draft.channels.includes(channel.id)}
                      onChange={(event) => toggleChannel(channel.id, event.target.checked)}/>
                    {channel.label}
                  </label>)}
                </div>
              </fieldset>

              {coop ? <>
                <label>What&apos;s your story? (optional)
                  <textarea aria-label="What's your story?" rows={3} maxLength={3000} value={draft.story}
                    onChange={(event) => change("story", event.target.value)}
                    placeholder="Tell us about yourself and what you enjoy."/>
                </label>
                <label>How would you contribute to the co-operative? <span aria-hidden="true">*</span>
                  <textarea aria-label="How would you contribute to the co-operative?" required rows={4} maxLength={3000}
                    value={draft.coopContribution} onChange={(event) => change("coopContribution", event.target.value)}
                    placeholder="Share your skills, interests, or learn-by-doing goals."/>
                </label>
                <label>Which co-operative objectives align with your interests? <span aria-hidden="true">*</span>
                  <textarea aria-label="Which co-operative objectives align with your interests?" required rows={4} maxLength={3000}
                    value={draft.objectiveAlignment} onChange={(event) => change("objectiveAlignment", event.target.value)}
                    placeholder="For example, increasing access to immersive storytelling or creative technology."/>
                </label>
              </> : <>
                <label>What do you do, and how could you contribute to the community? <span aria-hidden="true">*</span>
                  <textarea aria-label="Community contribution" required rows={4} maxLength={3000}
                    value={draft.communityContribution} onChange={(event) => change("communityContribution", event.target.value)}/>
                </label>
                <label>Website (optional)
                  <input aria-label="Website" type="url" maxLength={250} placeholder="https://"
                    value={draft.website} onChange={(event) => change("website", event.target.value)}/>
                </label>
                <label>Tell us a joke (optional)
                  <textarea aria-label="Tell us a joke" rows={2} maxLength={500}
                    value={draft.joke} onChange={(event) => change("joke", event.target.value)}/>
                </label>
              </>}

              <div className="membership-consents">
                <label><input type="checkbox" checked={draft.acceptsPrivacy}
                  onChange={(event) => change("acceptsPrivacy", event.target.checked)}/>
                  I accept the <Link href="/privacypolicy">Privacy Policy</Link>.
                </label>
                {coop ? <label><input type="checkbox" checked={draft.acceptsTerms}
                  onChange={(event) => change("acceptsTerms", event.target.checked)}/>
                  I accept the <Link href="/member-tc">Membership Terms &amp; Conditions</Link>.
                </label> : null}
              </div>
              <button className="membership-review-button" type="button" disabled={!valid}
                onClick={() => setReviewing(true)}>Review application</button>
            </form>
          )}
        </section>
      </div>

      <aside className="membership-summary" aria-label="Membership summary">
        <div className="membership-section-title"><span>03</span><h2>Membership summary</h2></div>
        <strong className="membership-summary-name">
          {membershipOptions.find((item) => item.kind === draft.kind)?.title}
        </strong>
        {cost ? <dl>
          <div><dt>Joining fee</dt><dd>{amountLabel(draft.kind === "community" ? 0 : 100)}</dd></div>
          {draft.kind === "user" ? <div><dt>First quarterly contribution</dt>
            <dd>{amountLabel(cost.recurringQuarterlyMinor)}</dd></div> : null}
          <div><dt>Estimated amount at joining</dt><dd>{amountLabel(cost.dueNowMinor)}</dd></div>
          {draft.kind === "user" ? <div><dt>Subsequent quarters</dt>
            <dd>{amountLabel(cost.recurringQuarterlyMinor)}</dd></div> : null}
        </dl> : null}
        <p className="membership-small-note">
          {draft.kind === "community"
            ? "Community membership is free. It does not confer co-operative voting rights."
            : "Illustrative amounts from the current site. Taxes, transaction fees and approved membership terms will be confirmed at real checkout."}
        </p>
        {coop ? <p className="membership-small-note">
          Co-operative membership and voting rights are subject to application review and acceptance, independently of payment.
        </p> : null}
        <button className="membership-submit-button" type="button" disabled>
          Applications not yet connected
        </button>
        <p className="membership-live-action">
          To apply now, <a href={officialMembershipUrl(draft.kind)} rel="noopener noreferrer">
            use the current EmpressVR application</a>.
        </p>
      </aside>
    </div>
    <details className="membership-status-examples">
      <summary>Preview future application status screens</summary>
      <p>These are examples only and never indicate the state of a real application.</p>
      <div>
        <Link href="/membership/status/pending">Pending</Link>
        <Link href="/membership/status/approved">Approved</Link>
        <Link href="/membership/status/rejected">Rejected</Link>
        <Link href="/membership/status/withdrawn">Withdrawn</Link>
      </div>
    </details>
  </div>;
}
