<script lang="ts">
  // Svelte 5의 $state는 "이 값이 바뀌면 화면을 다시 그려라"는 뜻의 반응형(reactive) 변수를
  // 선언한다. 그냥 let으로 선언하면 값은 바뀌어도 화면은 갱신되지 않는다.
  import { createReadingRecord } from './api';
  import type { ReadingRecord } from './types';
  import { READING_STATUSES, READING_STATUS_LABELS } from './types';

  // 부모(App.svelte)에게 "생성이 끝났다"고 알려주기 위한 콜백 props.
  // Svelte 5는 이벤트 대신 일반 함수를 props로 넘겨서 자식→부모 통신을 한다.
  let { onCreated }: { onCreated: (record: ReadingRecord) => void } =
    $props();

  let title = $state('');
  let author = $state('');
  let status = $state<(typeof READING_STATUSES)[number]>('want_to_read');
  let ratingInput = $state('');
  let submitting = $state(false);
  let error = $state<string | null>(null);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    error = null;
    submitting = true;
    try {
      const record = await createReadingRecord({
        title,
        author,
        status,
        // <input type="number">의 값은 항상 문자열이다. 빈 칸이면 rating 자체를
        // 보내지 않는다(선택 항목이라 undefined와 같은 뜻).
        rating: ratingInput === '' ? undefined : Number(ratingInput),
      });
      onCreated(record);
      title = '';
      author = '';
      status = 'want_to_read';
      ratingInput = '';
    } catch (err) {
      error = err instanceof Error ? err.message : '기록을 추가하지 못했습니다.';
    } finally {
      submitting = false;
    }
  }
</script>

<form onsubmit={handleSubmit}>
  <label>
    제목
    <input type="text" bind:value={title} required />
  </label>
  <label>
    저자
    <input type="text" bind:value={author} required />
  </label>
  <label>
    상태
    <select bind:value={status}>
      {#each READING_STATUSES as value (value)}
        <option {value}>{READING_STATUS_LABELS[value]}</option>
      {/each}
    </select>
  </label>
  <label>
    별점(1~5)
    <input type="number" min="1" max="5" bind:value={ratingInput} />
  </label>
  <button type="submit" disabled={submitting}>
    {submitting ? '추가하는 중…' : '추가'}
  </button>
</form>
{#if error}
  <p class="error">{error}</p>
{/if}
