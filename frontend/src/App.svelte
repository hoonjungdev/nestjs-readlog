<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchReadingRecords } from './lib/api';
  import CreateRecordForm from './lib/CreateRecordForm.svelte';
  import ReadingRecordRow from './lib/ReadingRecordRow.svelte';
  import type { ReadingRecord } from './lib/types';

  let records = $state<ReadingRecord[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // onMount는 컴포넌트가 처음 화면에 나타난 직후 한 번 실행된다.
  // 여기서 백엔드에 목록을 요청해 초기 데이터를 채운다.
  onMount(async () => {
    try {
      records = await fetchReadingRecords();
    } catch (err) {
      error =
        err instanceof Error
          ? err.message
          : '독서 기록을 불러오지 못했습니다.';
    } finally {
      loading = false;
    }
  });

  function handleCreated(record: ReadingRecord) {
    records = [...records, record];
  }

  function handleUpdated(updated: ReadingRecord) {
    records = records.map((record) =>
      record.id === updated.id ? updated : record,
    );
  }

  function handleDeleted(id: number) {
    records = records.filter((record) => record.id !== id);
  }
</script>

<h1>📚 독서 기록</h1>

<h2>새 기록 추가</h2>
<CreateRecordForm onCreated={handleCreated} />

<h2>목록</h2>
{#if loading}
  <p class="loading">불러오는 중…</p>
{:else if error}
  <p class="error">{error}</p>
{:else if records.length === 0}
  <p class="empty">아직 기록이 없습니다. 위 폼으로 첫 책을 추가해보세요.</p>
{:else}
  <ul class="records">
    {#each records as record (record.id)}
      <ReadingRecordRow
        {record}
        onUpdated={handleUpdated}
        onDeleted={handleDeleted}
      />
    {/each}
  </ul>
{/if}
