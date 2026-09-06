"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  submitRaise,
  type RaiseActionState,
} from "@/app/manage/[slug]/raise/actions";
import { formatInr, moneyPaise } from "@/domain/money";

type Target = Readonly<{
  name: string;
  quoteRupees: string;
  rank: string;
  slug: string;
}>;

function formatWholeRupees(value: string) {
  return formatInr(moneyPaise(BigInt(value) * 100n));
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button className="button button-primary" disabled={pending} type="submit">
      {pending ? "Opening Dodo…" : "Continue to Dodo checkout"}
    </button>
  );
}

export function RaiseForm({
  allTimeTargets,
  dailyTargets,
  minimumRupees,
  slug,
}: {
  allTimeTargets: readonly Target[];
  dailyTargets: readonly Target[];
  minimumRupees: string;
  slug: string;
}) {
  const action = useMemo(() => submitRaise.bind(null, slug), [slug]);
  const [state, formAction] = useActionState<RaiseActionState, FormData>(
    action,
    {},
  );
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [scope, setScope] = useState<"all_time" | "daily">("all_time");
  const [targetSlug, setTargetSlug] = useState("");
  const [amount, setAmount] = useState(minimumRupees);
  const targets = scope === "daily" ? dailyTargets : allTimeTargets;
  const target = targets.find((candidate) => candidate.slug === targetSlug);
  return (
    <form action={formAction} className="join-form owner-raise-form">
      <input name="idempotencyKey" type="hidden" value={idempotencyKey} />
      <input
        name="targetScope"
        type="hidden"
        value={targetSlug ? scope : "all_time"}
      />
      <label>
        Ranking target
        <select
          value={scope}
          onChange={(event) => {
            setScope(event.target.value as "all_time" | "daily");
            setTargetSlug("");
            setAmount(minimumRupees);
          }}
        >
          <option value="all_time">All time</option>
          <option value="daily">Daily</option>
        </select>
      </label>
      <label>
        Takeover target (optional)
        <select
          name="targetSlug"
          value={targetSlug}
          onChange={(event) => {
            const selected = targets.find(
              (item) => item.slug === event.target.value,
            );
            setTargetSlug(event.target.value);
            setAmount(selected?.quoteRupees ?? minimumRupees);
          }}
        >
          <option value="">
            {scope === "daily"
              ? "Choose a Daily position"
              : "Just add to my total"}
          </option>
          {targets.map((item) => (
            <option key={item.slug} value={item.slug}>
              Take {scope === "daily" ? "Daily " : ""}#{item.rank} · {item.name}{" "}
              · {formatWholeRupees(item.quoteRupees)}
            </option>
          ))}
        </select>
      </label>
      {target ? (
        <p className="form-notice">
          Server quote: pay at least {formatWholeRupees(target.quoteRupees)} to
          take{" "}
          {scope === "daily" ? "the target’s Daily" : "the target’s All-time"}{" "}
          position. The spot is not held
          {scope === "daily" ? " and Daily starts fresh at midnight IST." : "."}
        </p>
      ) : null}
      <label>
        Raise amount (INR)
        <input
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          inputMode="numeric"
          min={target?.quoteRupees ?? minimumRupees}
          name="amount"
          pattern="[0-9]+"
          required
        />
      </label>
      <p className="field-help">
        Minimum from the immutable original payment:{" "}
        {formatWholeRupees(minimumRupees)}.
      </p>
      {state.errors?.amount ? (
        <p className="field-error">{state.errors.amount}</p>
      ) : null}
      <label>
        Payment phone
        <input
          autoComplete="tel"
          name="phone"
          placeholder="+919876543210"
          required
          type="tel"
        />
      </label>
      {state.errors?.phone ? (
        <p className="field-error">{state.errors.phone}</p>
      ) : null}
      {state.message ? (
        <p className="form-notice error-notice" role="alert">
          {state.message}
        </p>
      ) : null}
      <Submit />
      <p className="provider-note">
        Dodo Payments hosts checkout. Only its signed server webhook adds this
        raise.
      </p>
    </form>
  );
}
