const handleSavePost = async (e?: React.FormEvent): Promise<void> => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    try {
      setSaving(true);

      const payload = {
        workspaceId: 'default',
        text: text,
        platforms: selectedPlatforms,
        mediaIds: mediaItems,
        scheduledFor: null,
        linkUrl: linkUrl.trim() ? linkUrl.trim() : null,
      };

      if (editingPostId) {
        await invoke('update_post', {
          inputJson: JSON.stringify({
            id: editingPostId,
            ...payload,
          }),
        });
      } else {
        await invoke('create_post', {
          inputJson: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      await loadPosts();
    } catch (err) {
      alert(`Error al guardar la publicación: ${err}`);
    } finally {
      setSaving(false);
    }
  };