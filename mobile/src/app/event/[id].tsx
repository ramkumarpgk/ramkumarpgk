import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { DateField } from '../../components/DateField';
import { Avatar, Button, Card, Chip, Field, Input } from '../../components/ui';
import { useApi } from '../../lib/api';
import { dayKey, parseDayKey } from '../../lib/dates';
import { colors } from '../../lib/theme';
import type { EventInput, Member } from '../../lib/types';

const REMINDERS: { label: string; value: number | null }[] = [
  { label: 'None', value: null },
  { label: 'At start', value: 0 },
  { label: '15 min', value: 15 },
  { label: '1 hour', value: 60 },
  { label: '1 day', value: 1440 },
];

/** Combine the date part of `day` with the time part of `time`. */
function withTime(day: Date, time: Date) {
  const d = new Date(day);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}

function defaultStart(dateParam?: string) {
  const d = dateParam ? parseDayKey(dateParam) : new Date();
  const now = new Date();
  d.setHours(now.getHours() + 1, 0, 0, 0);
  return d;
}

export default function EventScreen() {
  const { id, date } = useLocalSearchParams<{ id: string; date?: string }>();
  const isNew = id === 'new';
  const api = useApi();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState(() => defaultStart(date));
  const [end, setEnd] = useState(() => new Date(defaultStart(date).getTime() + 60 * 60 * 1000));
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [reminder, setReminder] = useState<number | null>(15);

  useEffect(() => {
    (async () => {
      try {
        const all = await api.members();
        setMembers(all);
        if (isNew) return;
        const e = await api.event(id);
        setTitle(e.title);
        setLocation(e.location);
        setDescription(e.description);
        setAllDay(e.allDay);
        setStart(e.allDay ? parseDayKey(e.start) : new Date(e.start));
        setEnd(e.allDay ? parseDayKey(e.end) : new Date(e.end));
        setMemberIds(e.memberIds);
        setReminder(e.reminderMinutes);
      } catch (err) {
        Alert.alert('Error', err instanceof Error ? err.message : String(err), [{ text: 'OK', onPress: () => router.back() }]);
      } finally {
        setLoading(false);
      }
    })();
  }, [api, id, isNew]);

  const recipients = useMemo(
    () => members.filter((m) => memberIds.includes(m.id)).flatMap((m) => m.emails.filter((e) => e.notify).map((e) => ({ m, e }))),
    [members, memberIds]
  );

  const toggleMember = (mid: string) =>
    setMemberIds((ids) => (ids.includes(mid) ? ids.filter((x) => x !== mid) : [...ids, mid]));

  // Moving the start keeps the event's duration.
  const changeStart = (d: Date) => {
    const duration = end.getTime() - start.getTime();
    setStart(d);
    setEnd(new Date(d.getTime() + Math.max(duration, allDay ? 0 : 15 * 60 * 1000)));
  };

  const save = async () => {
    if (!title.trim()) return Alert.alert('Please add a title');
    if (allDay ? dayKey(end) < dayKey(start) : end <= start) return Alert.alert('The end must be after the start');
    const body: EventInput = {
      title, location, description, allDay, memberIds, reminderMinutes: reminder,
      start: allDay ? dayKey(start) : start.toISOString(),
      end: allDay ? dayKey(end) : end.toISOString(),
    };
    setSaving(true);
    try {
      const res = isNew ? await api.createEvent(body) : await api.updateEvent(id, body);
      const lines = [
        res.inviteError ? `⚠️ Saved, but invites could not be sent: ${res.inviteError}` : null,
        res.invitesSentTo.length ? `Invites sent to:\n${res.invitesSentTo.join('\n')}` : null,
        res.cancelledFor?.length ? `Cancellation sent to:\n${res.cancelledFor.join('\n')}` : null,
      ].filter(Boolean);
      if (lines.length) Alert.alert(isNew ? 'Event added' : 'Event updated', lines.join('\n\n'));
      router.back();
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  };

  const remove = () =>
    Alert.alert('Delete event?', 'Everyone invited will receive a cancellation email.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteEvent(id);
            router.back();
          } catch (e) {
            Alert.alert('Error', e instanceof Error ? e.message : String(e));
          }
        },
      },
    ]);

  const resend = async () => {
    try {
      const r = await api.resendInvites(id);
      Alert.alert('Invites re-sent', r.invitesSentTo.join('\n') || 'Nobody to invite.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) return <ActivityIndicator style={{ marginTop: 40 }} />;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ title: isNew ? 'New event' : 'Edit event' }} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
        <Field label="Title">
          <Input value={title} onChangeText={setTitle} placeholder="Soccer practice" autoFocus={isNew} />
        </Field>

        <Card style={{ marginBottom: 14 }}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>All day</Text>
            <Switch value={allDay} onValueChange={setAllDay} />
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Starts</Text>
            <View style={styles.pickers}>
              <DateField mode="date" value={start} onChange={(d) => changeStart(withTime(d, start))} />
              {!allDay && <DateField mode="time" value={start} onChange={(t) => changeStart(withTime(start, t))} />}
            </View>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Ends</Text>
            <View style={styles.pickers}>
              <DateField mode="date" value={end} onChange={(d) => setEnd(withTime(d, end))} />
              {!allDay && <DateField mode="time" value={end} onChange={(t) => setEnd(withTime(end, t))} />}
            </View>
          </View>
        </Card>

        <Field label="Who's going?">
          {members.length === 0 ? (
            <Text style={styles.hint}>Add family members in the Family tab first.</Text>
          ) : (
            <View style={styles.wrap}>
              {members.map((m) => (
                <Chip key={m.id} label={m.name} color={m.color} selected={memberIds.includes(m.id)} onPress={() => toggleMember(m.id)} />
              ))}
            </View>
          )}
        </Field>

        {recipients.length > 0 && (
          <Card style={{ marginBottom: 14 }}>
            <Text style={styles.inviteTitle}>📨 Calendar invites will be emailed to</Text>
            {recipients.map(({ m, e }) => (
              <View key={e.address} style={styles.recipient}>
                <Avatar name={m.name} color={m.color} size={22} />
                <Text style={{ color: colors.text, flex: 1 }} numberOfLines={1}>{e.address}</Text>
                <Text style={styles.tag}>{e.label}</Text>
              </View>
            ))}
          </Card>
        )}

        <Field label="Location">
          <Input value={location} onChangeText={setLocation} placeholder="Optional" />
        </Field>
        <Field label="Notes">
          <Input value={description} onChangeText={setDescription} placeholder="Optional" multiline style={{ minHeight: 80, textAlignVertical: 'top' }} />
        </Field>
        <Field label="Reminder">
          <View style={styles.wrap}>
            {REMINDERS.map((r) => (
              <Chip key={r.label} label={r.label} selected={reminder === r.value} onPress={() => setReminder(r.value)} />
            ))}
          </View>
        </Field>

        <Button title={isNew ? 'Add event & send invites' : 'Save & send updates'} onPress={save} loading={saving} style={{ marginTop: 8 }} />
        {!isNew && (
          <>
            <Button title="Re-send invites" variant="secondary" onPress={resend} style={{ marginTop: 10 }} />
            <Button title="Delete event" variant="danger" onPress={remove} style={{ marginTop: 10 }} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { fontSize: 16, color: colors.text },
  pickers: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  hint: { color: colors.muted },
  inviteTitle: { fontWeight: '700', color: colors.text, marginBottom: 8 },
  recipient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
  tag: { fontSize: 12, color: colors.muted, textTransform: 'capitalize' },
});
