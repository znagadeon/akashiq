<h1 align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/logo-dark.png">
    <img src="docs/logo.png" alt="Akashiq" width="360">
  </picture>
</h1>

<p align="center"><strong>Remember why your code exists.</strong></p>

<p align="center"><a href="README.md">English</a> · 한국어</p>

Akashiq은 코드가 왜 지금의 모습이 되었는지 기억하는 의사결정 추적 도구입니다. 코드 뒤에 있는 결정을 이유와 함께 TypeScript 타입 객체로 기록하고, 각 결정을 그것을 증명하는 테스트와 연결합니다. 대시보드에서는 무엇을 결정했는지, 왜 그렇게 결정했는지, 지금도 테스트가 그 결정을 지키고 있는지 볼 수 있습니다. 에이전트 스킬은 코딩 에이전트가 같은 방식으로 일하도록 가르칩니다.

이름은 지금까지 일어난 모든 일이 기록되어 있다는 신화 속 기록, 아카식 레코드(Akashic Records)에서 따왔습니다. 끝의 Q는 Query를 뜻합니다.

![최소 예제의 Akashiq 대시보드](docs/dashboard.png)

## 왜 필요한가요

AI 에이전트와 함께 코드를 쓰면, 동작하는 코드만 남고 그 뒤의 의도는 증발합니다. 스펙 문서는 누구도 다 읽을 수 없을 만큼 빠르게 불어나고, 주석은 흩어진 채 낡아 가고, 새 요구사항은 아무도 기억하지 못하는 예전 정책을 조용히 덮어씁니다.

Akashiq은 모든 것을 기억하려 하지 않습니다. 잊어버리면 안 되는 이유를 기억합니다.

- **결정은 코드 안에 둡니다.** 코드만으로는 알 수 없는 기준값, 정책, 예외는 이유와 함께 한 곳에 선언하고, 코드는 거기서 값을 읽습니다.
- **테스트가 결정을 증명합니다.** 결정을 지키는 테스트는 `guards(decision, …)`로 그 사실을 표시합니다. 결정의 이름을 바꾸거나 지우면 타입체크가 깨집니다.
- **이력은 Git에 둡니다.** 결정에는 지금의 결론만 남깁니다. 거기까지 온 경위는 커밋 메시지에 있습니다.

요구사항 추적성(requirements traceability)을 AI 주도 개발에 맞게 적용하고, 에이전트가 실제로 들여다보는 코드 안에 둔 것입니다.

## 설치

```bash
npm install --save-dev akashiq @akashiq/core
```

`@akashiq/core`에는 `Decision` 타입과 `guards`가 있고, 다른 패키지에 의존하지 않습니다. `akashiq`에는 대시보드, CLI, 에이전트 스킬이 있고, Node.js 22 이상이 필요합니다. 결정 파일은 타입만 가져오고 `guards`는 테스트에서만 쓰기 때문에, 둘 다 devDependency로 설치하면 됩니다.

## 사용법

### 1. 결정 기록하기

결정은 관련 코드 옆의 `*.decision.ts` 파일에 둡니다. Akashiq은 프로젝트 어디에 있든 이 파일들을 찾습니다.

```ts
// src/shipping.decision.ts
import type { AnyDecision, Decision } from "@akashiq/core";

export const shippingDecisions = {
  freeShippingThreshold: {
    decision: "Orders at or above the threshold ship free",
    value: 50,
    reason: "Most orders cluster just below $50, so the threshold nudges them over",
  } satisfies Decision<number>,
  thresholdAfterDiscount: {
    decision: "Compare the order total after coupons, not before, with the free shipping threshold",
    dependsOn: (): AnyDecision[] => [shippingDecisions.freeShippingThreshold],
  } satisfies Decision,
};
```

| 필드 | |
|---|---|
| `decision` | 무엇을 결정했는지 한두 문장으로 적습니다. |
| `value` | 코드가 읽는 값이 있으면 적습니다. `Decision<T>`로 선언하면 반드시 있어야 하고, `Decision`으로 선언하면 둘 수 없습니다. 리터럴로 적습니다. |
| `reason` | 결정한 사람이 말한 이유입니다. 들은 이유가 없으면 지어내지 말고 비워 둡니다. |
| `dependsOn` | 이 결정의 의존성입니다. 여기 적은 결정이 바뀌면 이 결정도 다시 검토해야 합니다. |
| `unconfirmed` | 에이전트가 정하고 사람이 아직 확인하지 않은 결정에 붙입니다. |

`shippingDecisions.freeShippingThreshold` 같은 키 경로가 결정의 ID입니다.

### 2. 코드에서 읽기

```ts
// src/shipping.ts
import { shippingDecisions } from "./shipping.decision.ts";

export function shipsFree(order: Order): boolean {
  return order.subtotal - order.discount >= shippingDecisions.freeShippingThreshold.value;
}
```

### 3. 테스트로 지키기

```ts
// src/shipping.test.ts
import { guards } from "@akashiq/core";

it("charges shipping when a coupon brings the total below the threshold", () => {
  guards(shippingDecisions.thresholdAfterDiscount, () => {
    const threshold = shippingDecisions.freeShippingThreshold.value;
    const order = { subtotal: threshold + 5, discount: 10 };
    // Before the coupon, this order would ship free.
    expect(order.subtotal).toBeGreaterThanOrEqual(threshold);
    expect(shipsFree(order)).toBe(false);
  });
});
```

`guards`는 본문을 실행하기만 합니다. 이 테스트가 어떤 결정을 증명하는지 표시해서 Akashiq이 둘을 연결할 수 있게 합니다. 테스트 러너는 무엇이든 괜찮습니다.

### 4. 대시보드 열기

```bash
npx akashiq dashboard              # http://127.0.0.1:44519/
npx akashiq dashboard --port 8080  # another port; 0 picks a free one
```

localhost에 대시보드를 띄우고, 결정 파일이나 테스트 파일이 바뀔 때마다 다시 불러옵니다. 결정을 검색하고, 테스트가 없거나 아직 확인하지 않은 결정만 골라 보고, `dependsOn` 관계를 양쪽 방향으로 따라갈 수 있습니다. 어떤 결정도 가리키지 않는 `guards` 호출과 리터럴이 아닌 값도 표시합니다.

### 5. 에이전트에게 가르치기

```bash
npx akashiq skill install                       # .agents/skills/akashiq
npx akashiq skill install --dir .claude/skills  # Claude Code
```

Akashiq [에이전트 스킬](packages/akashiq/skills/akashiq/SKILL.md)을 프로젝트에 복사합니다. 스킬을 설치하면 에이전트는 다음처럼 일합니다.

- 정책적 결정을 코드에 바로 박지 않고 `*.decision.ts`에 기록하며, 이유를 지어내지 않습니다.
- 스스로 정한 결정에는 `unconfirmed`를 붙입니다.
- 정책을 바꾸기 전에 영향을 받는 결정을 찾아 보여 주고, 판단은 사람에게 맡깁니다.
- "이거 이렇게 동작해?"라는 질문에 테스트를 써서 돌려 보고 답하며, 그 테스트를 남깁니다.

Akashiq을 업그레이드한 뒤에는 이 명령을 다시 실행해 스킬을 갱신하세요.

### 6. 커밋 후 경고 받기

```bash
npx akashiq hook install   # adds `akashiq changes` to the post-commit hook
npx akashiq changes        # or run it yourself: HEAD~1..HEAD by default, or --from/--to
```

커밋할 때마다 Akashiq은 그 커밋이 영향을 줬을 수 있는 결정을 경고합니다. 결정을 지키는 테스트가 바뀌었거나, 결정의 글이 바뀌었거나, 다른 결정이 의존하는 값이 바뀐 경우입니다. 결정을 지키는 테스트의 단언 수를 커밋 전후로 세고, 바뀐 결정에 의존하는 결정을 함께 보여 주며, 결정마다 본문과 이유를 찍어서 그 결정이 아직 맞는지 바로 판단할 수 있게 합니다. 커밋을 막지는 않습니다.

```text
⚠ shippingDecisions.freeShippingThreshold (src/shipping.decision.ts:4)
    Orders at or above the threshold ship free
    Why: Most orders cluster just below $50, so the threshold nudges them over
  - A test guarding it changed: src/shipping.test.ts:10, expect 2 → 1 (fewer)
  - Depended on by shippingDecisions.thresholdAfterDiscount (src/shipping.decision.ts:9): Compare the order total after coupons, not before, with the free shipping threshold
```

`hook install`은 `core.hooksPath`를 포함해 git이 쓰는 hook 디렉터리에 씁니다. post-commit hook이 이미 있으면 건드리지 않으니, 거기에 `npx --no-install akashiq changes`를 직접 추가하세요.

## 동작 방식

Akashiq은 소스를 읽기만 하고 실행하지 않습니다. 그래서 프로젝트가 빌드되지 않거나 개발 환경이 갖춰지지 않아도 동작합니다.

- 결정 파일은 `*.decision.ts`이고, 테스트 파일은 `*.spec.*`과 `*.test.*`(`.ts`, `.tsx`, `.mts`, `.cts`)입니다. `node_modules`, `dist`, `.git`은 건너뜁니다.
- 내보낸(export) 객체의 속성 중 값에 `decision`이나 `reason` 속성이 있는 것이 결정입니다.
- `guards`의 첫 번째 인자가 결정의 ID와 똑같이 적혀 있으면 그 테스트와 결정이 연결됩니다.
- 값을 텍스트로 읽기 때문에, 상수를 참조하거나 객체를 펼치거나(spread) 함수를 호출하는 값은 따로 표시합니다. 실제 값을 보여 주거나 추적할 수 없기 때문입니다.

전체 프로젝트 예시는 [`examples/minimal`](examples/minimal)에 있습니다.

## 현황

Akashiq은 초기 단계(0.x)입니다. 1인 게임 프로젝트에서 결정 약 450개와 그 테스트를 관리하던 도구를 떼어 낸 것입니다. 앞으로 생각하고 있는 것은 다음과 같습니다.

- 직접 의존하는 결정을 넘어 `dependsOn`을 따라가는 변경 영향 분석
- 새 요구사항과 기존 결정 사이의 충돌 감지
- 테스트가 지키지 않는 결정으로 만드는 QA 체크리스트, 릴리스용 정책 변경 노트
- 큰 프로젝트를 위한 선택적 검색 어댑터

## 개발

```bash
pnpm install
pnpm check   # type check
pnpm test
pnpm lint
pnpm dashboard
```

Akashiq은 Akashiq으로 개발합니다. Akashiq 자체의 설계 결정은 `packages/*/src/*.decision.ts`에 있습니다. 이 저장소에서 에이전트가 따르는 규칙은 [AGENTS.md](AGENTS.md)에 있습니다.

## 라이선스

[MIT](LICENSE)
