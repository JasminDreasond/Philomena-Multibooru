import { fetchProfile, fetchSingleImage, getAccountBooruApi } from "./services/api";

/**
 * @typedef {(isLoading: boolean) => void} SetIsLoading
 * @typedef {import("./services/api").ImageObj} ImageObj
 * @typedef {(img: import('../services/api').ImageResult) => void} OnOpenImageLink
 */

/**
 * @param {string} refId
 * @param {SetIsLoading} setIsLoading
 * @param {OnOpenImageLink} onOpenImageLink
 * @param {ImageObj} image
 */
export const openImageLink = async (image, onOpenImageLink, setIsLoading, refId) => {
    setIsLoading(true);
    try {
      const apiKey = await getAccountBooruApi(image.booruUrl);
      const imgData = await fetchSingleImage(image.booruUrl, apiKey || '', refId);

      setIsLoading(false);
      if (imgData) {
        onOpenImageLink(imgData);
      } else {
        alert('Image not found or could not be loaded.');
      }
    } catch (err) {
      setIsLoading(false);
      console.error('Error fetching image link:', err);
      alert('Error fetching image data.');
    }
  };

/**
 * @typedef {(booruUrl: string, username: string, id: number) => void} OnOpenProfileLink
 */

/**
 * @param {string} matchTarget
 * @param {SetIsLoading} setIsLoading
 * @param {OnOpenProfileLink} onOpenProfileLink
 * @param {ImageObj} image
 */
export const openProfileLink = async (image, onOpenProfileLink, setIsLoading, matchTarget) => {
    setIsLoading(true);
    try {
      const profileData = await fetchProfile(image.booruUrl, matchTarget);

      setIsLoading(false);
      if (profileData) {
        onOpenProfileLink(image.booruUrl, profileData.name, profileData.id);
      } else {
        alert('Profile not found or could not be loaded.');
      }
    } catch (err) {
      setIsLoading(false);
      console.error('Error fetching profile link:', err);
      alert('Error fetching profile data.');
    }
  };