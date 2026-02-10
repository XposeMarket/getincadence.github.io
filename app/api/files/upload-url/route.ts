import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const BUCKET_NAME = 'cadence-files'
const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

// POST /api/files/upload-url — Get signed upload URL + create file record
export async function POST(request: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('org_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    const orgId = profile.org_id
    const body = await request.json()
    const { title, original_filename, doc_type, mime_type, size_bytes } = body

    // Validation
    if (!title || !original_filename || !mime_type || !size_bytes) {
      return NextResponse.json({ error: 'Missing required fields: title, original_filename, mime_type, size_bytes' }, { status: 400 })
    }

    if (size_bytes > MAX_FILE_SIZE) {
      return NextResponse.json({ error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` }, { status: 400 })
    }

    const validDocTypes = ['contract', 'receipt', 'proposal', 'invoice', 'other']
    const finalDocType = validDocTypes.includes(doc_type) ? doc_type : 'other'

    // Create file record first to get the ID
    const { data: fileRecord, error: insertError } = await supabase
      .from('files')
      .insert({
        org_id: orgId,
        uploaded_by_user_id: user.id,
        title,
        original_filename,
        doc_type: finalDocType,
        mime_type,
        size_bytes,
        storage_key: '', // placeholder, updated after we have the ID
        bucket_name: BUCKET_NAME,
        version_number: 1,
        parent_file_id: null,
      })
      .select('id')
      .single()

    if (insertError || !fileRecord) {
      console.error('Failed to create file record:', insertError)
      return NextResponse.json({ error: 'Failed to create file record' }, { status: 500 })
    }

    // Build storage key: org_id/file_id/original_filename
    const storageKey = `${orgId}/${fileRecord.id}/${original_filename}`

    // Update the file record with the real storage key
    await supabase
      .from('files')
      .update({ storage_key: storageKey })
      .eq('id', fileRecord.id)

    // Generate signed upload URL using admin client (bypasses RLS on storage)
    const adminSupabase = createAdminClient()

    // Ensure bucket exists (creates it on first upload)
    const { data: buckets } = await adminSupabase.storage.listBuckets()
    if (!buckets?.find((b: { name: string }) => b.name === BUCKET_NAME)) {
      await adminSupabase.storage.createBucket(BUCKET_NAME, { public: false })
    }

    const { data: uploadData, error: uploadError } = await adminSupabase
      .storage
      .from(BUCKET_NAME)
      .createSignedUploadUrl(storageKey)

    if (uploadError || !uploadData) {
      // Clean up the file record if upload URL generation fails
      await supabase.from('files').delete().eq('id', fileRecord.id)
      console.error('Failed to create signed upload URL:', uploadError)
      return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })
    }

    return NextResponse.json({
      file_id: fileRecord.id,
      upload_url: uploadData.signedUrl,
      storage_key: storageKey,
      token: uploadData.token,
    })
  } catch (error) {
    console.error('Upload URL error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
