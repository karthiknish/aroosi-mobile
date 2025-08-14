import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import {
  launchImageLibrary,
  MediaType,
  ImagePickerResponse,
} from "react-native-image-picker";
// Optional drag-and-drop (fallbacks to arrows if library not installed)
let OptionalDraggableFlatList: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  OptionalDraggableFlatList =
    require("react-native-draggable-flatlist").default;
} catch {}
import { useImageUpload, validateImage } from "../../hooks/useImageUpload";
import PlatformHaptics from "../../utils/PlatformHaptics";
import { useEnhancedApiClient } from "../../utils/enhancedApiClient";
import { ProfileImage, IMAGE_VALIDATION } from "../../types/image";
import { Colors, Layout } from "../../constants";
import { useToast } from "../../providers/ToastContext";
import ConfirmModal from "../../components/ui/ConfirmModal";

function getImageId(image: ProfileImage): string {
  return (
    (image._id as string) || (image.id as string) || (image.storageId as string)
  );
}

interface ImageUploadProps {
  title?: string;
  subtitle?: string;
  maxImages?: number;
  required?: boolean;
  onImagesChange?: (images: ProfileImage[]) => void;
}

const { width } = Dimensions.get("window");
const imageSize = (width - Layout.spacing.lg * 2 - Layout.spacing.md * 2) / 3;

export default function ImageUpload({
  title = "Profile Photos",
  subtitle = "Add photos to showcase your personality",
  maxImages = IMAGE_VALIDATION.MAX_IMAGES_PER_USER,
  required = false,
  onImagesChange,
}: ImageUploadProps) {
  const {
    images,
    isLoading,
    isUploading,
    uploadProgress,
    uploadImage,
    deleteImage,
    reorderImages,
    refetchImages,
  } = useImageUpload();
  const enhancedApi = useEnhancedApiClient();

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchConfirmVisible, setBatchConfirmVisible] = useState(false);
  const [localUploads, setLocalUploads] = useState<
    { id: string; uri: string; progress: number }[]
  >([]);
  const [currentTempId, setCurrentTempId] = useState<string | null>(null);
  const toast = useToast();

  // Notify parent component of image changes
  React.useEffect(() => {
    onImagesChange?.(images);
  }, [images, onImagesChange]);

  // Reflect global uploadProgress on most recent local tile
  useEffect(() => {
    if (!currentTempId) return;
    setLocalUploads((prev) =>
      prev.map((u) =>
        u.id === currentTempId ? { ...u, progress: uploadProgress } : u
      )
    );
  }, [uploadProgress, currentTempId]);

  const handleImagePicker = () => {
    if (images.length >= maxImages) {
      toast.show(`You can only upload up to ${maxImages} images.`, "info");
      return;
    }

    const options = {
      mediaType: "photo" as MediaType,
      quality: 0.8 as any,
      maxWidth: 1080,
      maxHeight: 1080,
    };

    launchImageLibrary(options, async (response: ImagePickerResponse) => {
      if (response.didCancel || response.errorMessage) {
        return;
      }

      const asset = response.assets?.[0];
      if (!asset) return;

      const imageResult = {
        uri: asset.uri!,
        type: asset.type || "image/jpeg",
        name: asset.fileName || `image_${Date.now()}.jpg`,
        size: asset.fileSize || 0,
      };

      // Validate image
      const validationError = await validateImage(imageResult);
      if (validationError) {
        toast.show(validationError, "error");
        return;
      }

      // Add local uploading tile
      const tempId = `temp-${Date.now()}`;
      setLocalUploads((prev) => [
        ...prev,
        { id: tempId, uri: imageResult.uri, progress: 0 },
      ]);
      setCurrentTempId(tempId);

      // Upload image
      uploadImage(imageResult)
        .then(() => {
          setLocalUploads((prev) => prev.filter((u) => u.id !== tempId));
          setCurrentTempId(null);
        })
        .catch(() => {
          setLocalUploads((prev) => prev.filter((u) => u.id !== tempId));
          setCurrentTempId(null);
        });
    });
  };

  const handleDeleteImage = (imageId: string) => {
    setPendingDeleteId(imageId);
    setConfirmVisible(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteImage(pendingDeleteId);
      toast.show("Image deleted.", "success");
    } catch (e) {
      // Hook handles error toast/alerts if any
    } finally {
      setConfirmVisible(false);
      setPendingDeleteId(null);
    }
  };

  const cancelDelete = () => {
    setConfirmVisible(false);
    setPendingDeleteId(null);
  };

  const toggleSelectionMode = () => {
    setSelectionMode((s) => !s);
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setBatchConfirmVisible(true);
  };

  const confirmBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map((id) => deleteImage(id)));
      setSelectedIds(new Set());
      setSelectionMode(false);
      toast.show("Selected photos deleted.", "success");
    } catch {}
    setBatchConfirmVisible(false);
  };

  const handleSetMain = async (idx: number) => {
    if (idx <= 0) return;
    // Prefer dedicated endpoint if available
    const target = images[idx];
    const serverImageId = (target._id as string) || (target.id as string);
    if (serverImageId) {
      const res: any = await enhancedApi.setMainProfileImage(serverImageId);
      if (res?.success) {
        await refetchImages();
        toast.show("Set as main photo.", "success");
        return;
      }
    }
    // Fallback: reorder
    const ids = images.map((img) => getImageId(img));
    const [picked] = ids.splice(idx, 1);
    const newOrder = [picked, ...ids];
    await reorderImages(newOrder);
    toast.show("Set as main photo.", "success");
  };

  const handleMove = async (fromIdx: number, direction: -1 | 1) => {
    const toIdx = fromIdx + direction;
    if (toIdx < 0 || toIdx >= images.length) return;
    const ids = images.map((img) => getImageId(img));
    const [moved] = ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, moved);
    await reorderImages(ids);
  };

  // Handle drag-and-drop end: compute new order of image items only
  const handleDragEnd = async (data: GridItem[]) => {
    try {
      const newOrder = data
        .filter((it) => it.type === "image")
        .map((it) => getImageId((it as any).image as ProfileImage));
      // Only call if order actually changed
      const currentOrder = images.map((img) => getImageId(img));
      const changed =
        newOrder.length === currentOrder.length &&
        newOrder.some((id, i) => id !== currentOrder[i]);
      if (changed) {
        await reorderImages(newOrder);
        PlatformHaptics.success();
      }
    } catch (e) {
      console.error("Drag reorder failed", e);
    }
  };

  type GridItem =
    | { key: string; type: "upload"; uri: string; progress: number }
    | { key: string; type: "image"; image: ProfileImage };

  const gridData: GridItem[] = useMemo(() => {
    const uploads = localUploads.map(
      (u) =>
        ({
          key: u.id,
          type: "upload",
          uri: u.uri,
          progress: u.progress,
        } as GridItem)
    );
    const imgs = images.map(
      (img) => ({ key: getImageId(img), type: "image", image: img } as GridItem)
    );
    return [...uploads, ...imgs];
  }, [localUploads, images]);

  const renderGridTile = (
    item: GridItem,
    index: number,
    drag?: () => void,
    isActive?: boolean
  ) => {
    if (item.type === "upload") {
      return (
        <View key={item.key} style={styles.imageContainer}>
          <Image source={{ uri: item.uri }} style={styles.image} />
          <View style={styles.progressOverlay}>
            <ActivityIndicator color={Colors.background.primary} />
            <Text style={styles.progressText}>
              {Math.min(100, Math.max(0, Math.round(item.progress)))}%
            </Text>
          </View>
        </View>
      );
    }
    const img = item.image;
    const id = getImageId(img);
    const isSelected = selectionMode && selectedIds.has(id);
    return (
      <TouchableOpacity
        key={item.key}
        style={[styles.imageContainer, isActive ? styles.dragActive : null]}
        activeOpacity={0.9}
        onLongPress={() => {
          if (selectionMode) {
            toggleSelectionMode();
          } else if (drag) {
            drag();
          }
        }}
        onPress={() => {
          if (selectionMode) toggleSelect(id);
        }}
      >
        <Image source={{ uri: img.url }} style={styles.image} />
        {index === localUploads.length && (
          <View style={styles.mainBadge}>
            <Text style={styles.mainBadgeText}>Main</Text>
          </View>
        )}
        {selectionMode && (
          <View style={styles.checkbox}>
            <Text style={styles.checkboxText}>{isSelected ? "✓" : ""}</Text>
          </View>
        )}
        {!selectionMode && (
          <View style={styles.reorderControls}>
            {index > localUploads.length && (
              <TouchableOpacity
                style={[styles.reorderBtn, styles.makeMainBtn]}
                onPress={() => handleSetMain(index - localUploads.length)}
              >
                <Text style={styles.reorderBtnText}>★</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        {!selectionMode && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteImage(id)}
          >
            <Text style={styles.deleteButtonText}>×</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderAddButton = () => (
    <TouchableOpacity
      style={styles.addButton}
      onPress={handleImagePicker}
      disabled={isUploading || images.length >= maxImages}
    >
      {isUploading ? (
        <View style={styles.uploadingContainer}>
          <ActivityIndicator size="small" color={Colors.primary[500]} />
          <Text style={styles.uploadingText}>{uploadProgress}%</Text>
        </View>
      ) : (
        <>
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Add Photo</Text>
        </>
      )}
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary[500]} />
          <Text style={styles.loadingText}>Loading images...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {title}
          {required && <Text style={styles.required}> *</Text>}
        </Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <Text style={styles.count}>
          {images.length} of {maxImages} photos
        </Text>
      </View>

      {OptionalDraggableFlatList ? (
        <OptionalDraggableFlatList
          data={gridData}
          keyExtractor={(it: GridItem) => it.key}
          numColumns={3}
          activationDistance={16}
          autoscrollSpeed={200}
          autoscrollThreshold={60}
          containerStyle={{}}
          contentContainerStyle={styles.imageList}
          onDragBegin={async () => {
            await PlatformHaptics.selection();
          }}
          renderItem={({ item, index, drag, isActive }: any) =>
            renderGridTile(
              item as GridItem,
              index as number,
              item.type === "image" && !selectionMode ? drag : undefined,
              isActive as boolean
            )
          }
          onDragEnd={({ data }: { data: GridItem[] }) => handleDragEnd(data)}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.imageList}
        >
          {gridData.map((item, idx) => renderGridTile(item, idx))}
          {images.length + localUploads.length < maxImages && renderAddButton()}
        </ScrollView>
      )}

      {/* Batch actions */}
      <View
        style={{
          flexDirection: "row",
          gap: Layout.spacing.sm,
          marginTop: Layout.spacing.sm,
        }}
      >
        <TouchableOpacity onPress={toggleSelectionMode}>
          <Text style={{ color: Colors.primary[500], fontWeight: "600" }}>
            {selectionMode ? "Cancel" : "Select"}
          </Text>
        </TouchableOpacity>
        {selectionMode && (
          <TouchableOpacity
            onPress={handleBatchDelete}
            disabled={selectedIds.size === 0}
          >
            <Text
              style={{
                color:
                  selectedIds.size === 0
                    ? Colors.text.tertiary
                    : Colors.error[500],
                fontWeight: "600",
              }}
            >
              Delete Selected
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Guidelines */}
      <View style={styles.guidelines}>
        <Text style={styles.guidelinesTitle}>Photo Guidelines:</Text>
        <Text style={styles.guidelinesText}>
          • First photo will be your main profile picture
        </Text>
        <Text style={styles.guidelinesText}>
          • Use clear, recent photos of yourself
        </Text>
        <Text style={styles.guidelinesText}>
          • Maximum file size: 5MB per image
        </Text>
        <Text style={styles.guidelinesText}>
          • Supported formats: JPEG, PNG, WebP
        </Text>
      </View>

      {required && images.length === 0 && (
        <Text style={styles.errorText}>At least one photo is required</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Layout.spacing.md,
  },
  header: {
    marginBottom: Layout.spacing.md,
  },
  title: {
    fontSize: Layout.typography.fontSize.lg,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.xs,
  },
  required: {
    color: Colors.error[500],
  },
  subtitle: {
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },
  count: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.tertiary,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: Layout.spacing.xl,
  },
  loadingText: {
    marginTop: Layout.spacing.sm,
    fontSize: Layout.typography.fontSize.base,
    color: Colors.text.secondary,
  },
  imageList: {
    paddingVertical: Layout.spacing.sm,
    gap: Layout.spacing.md,
  },
  imageContainer: {
    position: "relative",
    width: imageSize,
    height: imageSize,
  },
  dragActive: {
    opacity: 0.9,
    transform: [{ scale: 1.02 }],
  },
  reorderControls: {
    position: "absolute",
    left: Layout.spacing.xs,
    bottom: Layout.spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: Layout.spacing.xs,
  },
  makeMainBtn: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: Layout.radius.sm,
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: 2,
  },
  reorderBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  reorderBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  arrowRow: {
    flexDirection: "row",
    gap: Layout.spacing.xs,
  },
  reorderArrow: {
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: Layout.radius.sm,
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: 2,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: Layout.radius.md,
    backgroundColor: Colors.background.secondary,
  },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  progressText: {
    marginTop: 6,
    color: Colors.background.primary,
    fontWeight: "600",
  },
  mainBadge: {
    position: "absolute",
    top: Layout.spacing.xs,
    left: Layout.spacing.xs,
    backgroundColor: Colors.primary[500],
    paddingHorizontal: Layout.spacing.xs,
    paddingVertical: 2,
    borderRadius: Layout.radius.sm,
  },
  mainBadgeText: {
    fontSize: Layout.typography.fontSize.xs,
    color: "white",
    fontWeight: "600",
  },
  deleteButton: {
    position: "absolute",
    top: Layout.spacing.xs,
    right: Layout.spacing.xs,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error[500],
    alignItems: "center",
    justifyContent: "center",
  },
  deleteButtonText: {
    color: "white",
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "bold",
    lineHeight: 16,
  },
  indexBadge: {
    position: "absolute",
    bottom: Layout.spacing.xs,
    right: Layout.spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  indexText: {
    color: "white",
    fontSize: Layout.typography.fontSize.xs,
    fontWeight: "600",
  },
  checkbox: {
    position: "absolute",
    top: Layout.spacing.xs,
    left: Layout.spacing.xs,
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxText: {
    color: "#fff",
    fontWeight: "700",
  },
  addButton: {
    width: imageSize,
    height: imageSize,
    borderRadius: Layout.radius.md,
    borderWidth: 2,
    borderColor: Colors.primary[500],
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background.secondary,
  },
  addButtonIcon: {
    fontSize: Layout.typography.fontSize["2xl"],
    color: Colors.primary[500],
    marginBottom: Layout.spacing.xs,
  },
  addButtonText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.primary[500],
    fontWeight: "500",
  },
  uploadingContainer: {
    alignItems: "center",
  },
  uploadingText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.primary[500],
    marginTop: Layout.spacing.xs,
  },
  guidelines: {
    marginTop: Layout.spacing.md,
    padding: Layout.spacing.md,
    backgroundColor: Colors.background.secondary,
    borderRadius: Layout.radius.md,
  },
  guidelinesTitle: {
    fontSize: Layout.typography.fontSize.base,
    fontWeight: "600",
    color: Colors.text.primary,
    marginBottom: Layout.spacing.sm,
  },
  guidelinesText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.text.secondary,
    marginBottom: Layout.spacing.xs,
  },
  errorText: {
    fontSize: Layout.typography.fontSize.sm,
    color: Colors.error[500],
    marginTop: Layout.spacing.xs,
  },
});
