import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MonthCalendar } from '../../components/MonthCalendar';
import { Chip, ErrorBanner } from '../../components/ui';
import { useApi } from '../../lib/api';
import { addDays, dayKey, eventDays, formatDay, formatEventWhen, monthGrid, parseDayKey, startOfMonth } from '../../lib/dates';
import { colors } from '../../lib/theme';
import { useFocusLoad } from '../../lib/useAsync';

export default function CalendarScreen() {
  const api = useApi();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [filter, setFilter] = useState<string | null>(null);

  const { data, error, loading, reload } = useFocusLoad(async () => {
    const grid = monthGrid(month);
    const [members, events] = await Promise.all([
      api.members(),
      api.events({ from: grid[0].toISOString(), to: addDays(grid[41], 1).toISOString() }),
    ]);
    return { members, events };
  }, [api, month]);

  const members = data?.members ?? [];
  const events = useMemo(
    () => (data?.events ?? []).filter((e) => !filter || e.memberIds.includes(filter)),
    [data, filter]
  );
  const colorOf = (id: string) => members.find((m) => m.id === id)?.color ?? colors.muted;

  const dotsByDay = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const e of events) {
      const cs = e.memberIds.length ? e.memberIds.map(colorOf) : [colors.muted];
      for (const d of eventDays(e)) (map[d] ??= []).push(...cs);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, members]);

  const dayEvents = events.filter((e) => eventDays(e).includes(selected));

  const changeMonth = (delta: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next);
    setSelected(dayKey(next));
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <MonthCalendar month={month} selected={selected} onSelect={setSelected} onChangeMonth={changeMonth} dotsByDay={dotsByDay} />

      {members.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          <Chip label="Everyone" selected={!filter} onPress={() => setFilter(null)} />
          {members.map((m) => (
            <Chip key={m.id} label={m.name} color={m.color} selected={filter === m.id} onPress={() => setFilter(filter === m.id ? null : m.id)} />
          ))}
        </ScrollView>
      )}

      {error && <ErrorBanner message={error} onRetry={reload} />}

      <FlatList
        data={dayEvents}
        keyExtractor={(e) => e.id}
        refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={reload} />}
        contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
        ListHeaderComponent={<Text style={styles.dayTitle}>{formatDay(parseDayKey(selected))}</Text>}
        ListEmptyComponent={
          loading && !data ? (
            <ActivityIndicator style={{ marginTop: 24 }} />
          ) : (
            <Text style={styles.empty}>
              {members.length === 0 ? 'Start by adding your family in the Family tab.' : 'Nothing planned. Tap + to add an event.'}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/event/${item.id}`)} style={styles.event}>
            <View style={[styles.bar, { backgroundColor: item.memberIds[0] ? colorOf(item.memberIds[0]) : colors.muted }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Text style={styles.meta}>
                {formatEventWhen(item)}
                {item.location ? ` · ${item.location}` : ''}
              </Text>
              <View style={styles.who}>
                {item.memberIds.map((id) => (
                  <Text key={id} style={[styles.whoName, { color: colorOf(id) }]}>
                    {members.find((m) => m.id === id)?.name}
                  </Text>
                ))}
              </View>
            </View>
          </Pressable>
        )}
      />

      <Pressable
        style={styles.fab}
        accessibilityLabel="Add event"
        onPress={() => router.push({ pathname: '/event/[id]', params: { id: 'new', date: selected } })}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  filters: { paddingHorizontal: 12, paddingTop: 10 },
  dayTitle: { fontSize: 15, fontWeight: '700', color: colors.muted, marginBottom: 8 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 24 },
  event: { flexDirection: 'row', backgroundColor: colors.card, borderRadius: 12, padding: 12, marginBottom: 8, gap: 12 },
  bar: { width: 4, borderRadius: 2 },
  eventTitle: { fontSize: 16, fontWeight: '600', color: colors.text },
  meta: { color: colors.muted, marginTop: 2 },
  who: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  whoName: { fontSize: 13, fontWeight: '600' },
  fab: {
    position: 'absolute', right: 20, bottom: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 },
  },
  fabText: { color: '#fff', fontSize: 32, lineHeight: 34 },
});
