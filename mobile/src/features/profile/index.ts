/**
 * Profile feature — profile, avatar, change password, language (spec §2.3, §2.7).
 */
export { profileApi, type ChangePasswordBody, type UpdateProfileBody } from './api/profile-api';
export {
  profileKeys,
  useChangeLanguage,
  useChangePassword,
  useMe,
  useUpdateProfile,
  useUploadAvatar,
} from './hooks/useProfile';
