export type RootStackParamList = {
  SnagList: undefined;
  SnagDetail: { snagId: string };
  CreateSnag:{ snagId?: string } | undefined;
};