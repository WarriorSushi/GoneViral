export type DomainSuccess<T> = Readonly<{
  ok: true;
  value: T;
}>;

export type DomainFailure<Code extends string> = Readonly<{
  ok: false;
  code: Code;
}>;

export type DomainResult<T, Code extends string> =
  DomainSuccess<T> | DomainFailure<Code>;

export function domainSuccess<T>(value: T): DomainSuccess<T> {
  return { ok: true, value };
}

export function domainFailure<Code extends string>(
  code: Code,
): DomainFailure<Code> {
  return { ok: false, code };
}
