import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, ErrorBanner } from '../../components/ui';
import { useApi } from '../../lib/api';
import { colors } from '../../lib/theme';
import { useFocusLoad } from '../../lib/useAsync';

const LABEL_ICON = { work: '💼', personal: '🏠', school: '🎒', other: '✉️' } as const;

export default function FamilyScreen() {
  const api = useApi();
  const { data, error, loading, reload } = useFocusLoad(() => api.members(), [api]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {error && <ErrorBanner message={error} onRetry={reload} />}
      <FlatList
        data={data ?? []}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}
        ListHeaderComponent={
          <Text style={styles.hint}>
            Add every email each person uses — work and personal. Invites are sent to all of them, so events show up in whichever calendar they check.
          </Text>
        }
        ListEmptyComponent={!loading ? <Text style={styles.empty}>No family members yet.</Text> : undefined}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => router.push(`/member/${item.id}`)}>
            <Avatar name={item.name} color={item.color} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.emails.map((e) => (
                <Text key={e.address} style={[styles.email, !e.notify && { textDecorationLine: 'line-through' }]}>
                  {LABEL_ICON[e.label]} {e.address}
                </Text>
              ))}
            </View>
            <Text style={styles.chev}>›</Text>
          </Pressable>
        )}
        ListFooterComponent={<Button title="Add family member" onPress={() => router.push('/member/new')} style={{ marginTop: 8 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { color: colors.muted, marginBottom: 12, lineHeight: 20 },
  empty: { color: colors.muted, textAlign: 'center', marginVertical: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, padding: 14, borderRadius: 12, marginBottom: 8 },
  name: { fontSize: 17, fontWeight: '600', color: colors.text, marginBottom: 2 },
  email: { color: colors.muted, fontSize: 14, marginTop: 1 },
  chev: { fontSize: 24, color: colors.border },
});
