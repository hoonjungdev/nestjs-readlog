<script lang="ts">
  import { deleteReadingRecord, updateReadingRecord } from './api';
  import type { ReadingRecord } from './types';
  import { READING_STATUSES, READING_STATUS_LABELS } from './types';

  let {
    record,
    onUpdated,
    onDeleted,
  }: {
    record: ReadingRecord;
    onUpdated: (record: ReadingRecord) => void;
    onDeleted: (id: number) => void;
  } = $props();

  // 상태/별점 select는 이 지역 변수에 바인딩된다. record prop이 바뀔 때(부모가
  // 목록을 새로 불러왔을 때 등) 화면도 최신 값으로 맞추기 위해 $effect로 동기화한다.
  let status = $state(record.status);
  let ratingInput = $state(record.rating === null ? '' : String(record.rating));
  let saving = $state(false);
  let error = $state<string | null>(null);

  $effect(() => {
    status = record.status;
    ratingInput = record.rating === null ? '' : String(record.rating);
  });

  async function handleStatusChange() {
    await save({ status });
  }

  async function handleRatingChange() {
    // 빈 칸을 선택하면 null(별점 지우기)로, 숫자를 고르면 그 숫자로 보낸다.
    await save({ rating: ratingInput === '' ? null : Number(ratingInput) });
  }

  async function save(
    patch: Partial<{ status: typeof status; rating: number | null }>,
  ) {
    error = null;
    saving = true;
    try {
      const updated = await updateReadingRecord(record.id, patch);
      onUpdated(updated);
    } catch (err) {
      error = err instanceof Error ? err.message : '수정하지 못했습니다.';
      // 실패했으니 화면을 서버가 실제로 갖고 있는 값으로 되돌린다.
      status = record.status;
      ratingInput = record.rating === null ? '' : String(record.rating);
    } finally {
      saving = false;
    }
  }

  async function handleDelete() {
    if (!confirm(`"${record.title}" 기록을 삭제할까요?`)) return;
    error = null;
    saving = true;
    try {
      await deleteReadingRecord(record.id);
      onDeleted(record.id);
    } catch (err) {
      error = err instanceof Error ? err.message : '삭제하지 못했습니다.';
      saving = false;
    }
  }
</script>

<li class="record">
  <div class="title-author">
    <div class="title">{record.title}</div>
    <div class="author">{record.author}</div>
  </div>
  <label>
    상태
    <select bind:value={status} disabled={saving} onchange={handleStatusChange}>
      {#each READING_STATUSES as value (value)}
        <option {value}>{READING_STATUS_LABELS[value]}</option>
      {/each}
    </select>
  </label>
  <label>
    별점
    <select
      bind:value={ratingInput}
      disabled={saving}
      onchange={handleRatingChange}
    >
      <option value="">없음</option>
      {#each [1, 2, 3, 4, 5] as value (value)}
        <option value={String(value)}>{value}</option>
      {/each}
    </select>
  </label>
  <button type="button" class="danger" disabled={saving} onclick={handleDelete}>
    삭제
  </button>
</li>
{#if error}
  <p class="error">{error}</p>
{/if}
