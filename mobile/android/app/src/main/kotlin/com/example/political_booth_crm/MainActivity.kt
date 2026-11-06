package com.example.political_booth_crm

import android.Manifest
import android.content.ContentProviderOperation
import android.content.ContentUris
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.ContactsContract
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "com.example.political_booth_crm/contacts"
    private val PERMISSION_REQUEST_CODE = 9001
    private var pendingPermissionResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "requestPermission" -> {
                    val readGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED
                    val writeGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_CONTACTS) == PackageManager.PERMISSION_GRANTED
                    if (readGranted && writeGranted) {
                        result.success(true)
                    } else {
                        pendingPermissionResult = result
                        ActivityCompat.requestPermissions(
                            this,
                            arrayOf(Manifest.permission.READ_CONTACTS, Manifest.permission.WRITE_CONTACTS),
                            PERMISSION_REQUEST_CODE
                        )
                    }
                }
                "getContacts" -> {
                    val readGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.READ_CONTACTS) == PackageManager.PERMISSION_GRANTED
                    if (!readGranted) {
                        result.error("PERMISSION_DENIED", "Contacts permission not granted", null)
                        return@setMethodCallHandler
                    }
                    Thread {
                        try {
                            val list = fetchAllDeviceContacts()
                            runOnUiThread { result.success(list) }
                        } catch (e: Exception) {
                            runOnUiThread { result.error("FETCH_ERROR", e.message, null) }
                        }
                    }.start()
                }
                "updateContact" -> {
                    val writeGranted = ContextCompat.checkSelfPermission(this, Manifest.permission.WRITE_CONTACTS) == PackageManager.PERMISSION_GRANTED
                    if (!writeGranted) {
                        result.error("PERMISSION_DENIED", "Write contacts permission not granted", null)
                        return@setMethodCallHandler
                    }
                    val contactId = call.argument<String>("id") ?: ""
                    val name = call.argument<String>("name") ?: ""
                    val phone = call.argument<String>("phone") ?: ""
                    val address = call.argument<String>("address") ?: ""
                    val note = call.argument<String>("note") ?: ""
                    val organization = call.argument<String>("organization") ?: ""

                    Thread {
                        try {
                            val ok = updateDeviceContact(contactId, name, phone, address, note, organization)
                            runOnUiThread { result.success(ok) }
                        } catch (e: Exception) {
                            runOnUiThread { result.error("UPDATE_ERROR", e.message, null) }
                        }
                    }.start()
                }
                "openExternalEdit" -> {
                    val contactId = call.argument<String>("id") ?: ""
                    try {
                        val idLong = contactId.toLongOrNull()
                        if (idLong != null) {
                            val uri = ContentUris.withAppendedId(ContactsContract.Contacts.CONTENT_URI, idLong)
                            val intent = Intent(Intent.ACTION_EDIT).apply {
                                data = uri
                                putExtra("finishActivityOnSaveCompleted", true)
                            }
                            startActivity(intent)
                            result.success(true)
                        } else {
                            result.success(false)
                        }
                    } catch (e: Exception) {
                        result.error("EDIT_INTENT_ERROR", e.message, null)
                    }
                }
                "openExternalInsert" -> {
                    try {
                        val name = call.argument<String>("name") ?: ""
                        val phone = call.argument<String>("phone") ?: ""
                        val address = call.argument<String>("address") ?: ""
                        val intent = Intent(Intent.ACTION_INSERT).apply {
                            type = ContactsContract.Contacts.CONTENT_TYPE
                            if (name.isNotEmpty()) putExtra(ContactsContract.Intents.Insert.NAME, name)
                            if (phone.isNotEmpty()) putExtra(ContactsContract.Intents.Insert.PHONE, phone)
                            if (address.isNotEmpty()) putExtra(ContactsContract.Intents.Insert.POSTAL, address)
                            putExtra("finishActivityOnSaveCompleted", true)
                        }
                        startActivity(intent)
                        result.success(true)
                    } catch (e: Exception) {
                        result.error("INSERT_INTENT_ERROR", e.message, null)
                    }
                }
                else -> result.notImplemented()
            }
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == PERMISSION_REQUEST_CODE) {
            val granted = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
            pendingPermissionResult?.success(granted)
            pendingPermissionResult = null
        }
    }

    private fun fetchAllDeviceContacts(): List<Map<String, Any?>> {
        val contactsMap = LinkedHashMap<String, MutableMap<String, Any?>>()

        val projection = arrayOf(
            ContactsContract.Data.CONTACT_ID,
            ContactsContract.Data.DISPLAY_NAME_PRIMARY,
            ContactsContract.Data.MIMETYPE,
            ContactsContract.Data.DATA1,
            ContactsContract.Data.DATA2,
            ContactsContract.Data.DATA3,
            ContactsContract.Data.DATA4,
            ContactsContract.Data.DATA7,
            ContactsContract.Data.DATA8,
            ContactsContract.Data.DATA9,
            ContactsContract.Data.DATA10
        )

        val cursor = contentResolver.query(
            ContactsContract.Data.CONTENT_URI,
            projection,
            null,
            null,
            "${ContactsContract.Data.DISPLAY_NAME_PRIMARY} COLLATE LOCALIZED ASC"
        )

        cursor?.use { c ->
            val idxId = c.getColumnIndex(ContactsContract.Data.CONTACT_ID)
            val idxName = c.getColumnIndex(ContactsContract.Data.DISPLAY_NAME_PRIMARY)
            val idxMime = c.getColumnIndex(ContactsContract.Data.MIMETYPE)
            val idxData1 = c.getColumnIndex(ContactsContract.Data.DATA1)
            val idxData2 = c.getColumnIndex(ContactsContract.Data.DATA2)
            val idxData3 = c.getColumnIndex(ContactsContract.Data.DATA3)
            val idxData4 = c.getColumnIndex(ContactsContract.Data.DATA4)
            val idxData7 = c.getColumnIndex(ContactsContract.Data.DATA7)
            val idxData8 = c.getColumnIndex(ContactsContract.Data.DATA8)
            val idxData9 = c.getColumnIndex(ContactsContract.Data.DATA9)
            val idxData10 = c.getColumnIndex(ContactsContract.Data.DATA10)

            while (c.moveToNext()) {
                val contactId = if (idxId >= 0) c.getString(idxId) ?: continue else continue
                val displayName = if (idxName >= 0) c.getString(idxName) ?: "" else ""
                val mime = if (idxMime >= 0) c.getString(idxMime) ?: "" else ""

                val entry = contactsMap.getOrPut(contactId) {
                    hashMapOf(
                        "id" to contactId,
                        "displayName" to displayName,
                        "phones" to mutableListOf<Map<String, String>>(),
                        "addresses" to mutableListOf<Map<String, String>>(),
                        "emails" to mutableListOf<Map<String, String>>(),
                        "organizations" to mutableListOf<Map<String, String>>(),
                        "notes" to mutableListOf<String>()
                    )
                }

                if ((entry["displayName"] as? String).isNullOrEmpty() && displayName.isNotEmpty()) {
                    entry["displayName"] = displayName
                }

                when (mime) {
                    ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE -> {
                        val number = (if (idxData1 >= 0) c.getString(idxData1) else null)?.trim() ?: ""
                        if (number.isNotEmpty()) {
                            val typeInt = if (idxData2 >= 0) c.getInt(idxData2) else ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE
                            val customLabel = if (idxData3 >= 0) c.getString(idxData3) else null
                            val label = ContactsContract.CommonDataKinds.Phone.getTypeLabel(resources, typeInt, customLabel ?: "").toString()
                            @Suppress("UNCHECKED_CAST")
                            val phones = entry["phones"] as MutableList<Map<String, String>>
                            val cleanNum = number.replace(Regex("[^0-9+]"), "")
                            if (phones.none { it["number"]?.replace(Regex("[^0-9+]"), "") == cleanNum }) {
                                phones.add(mapOf("number" to number, "label" to label))
                            }
                        }
                    }
                    ContactsContract.CommonDataKinds.StructuredPostal.CONTENT_ITEM_TYPE -> {
                        val formatted = (if (idxData1 >= 0) c.getString(idxData1) else null)?.trim() ?: ""
                        val street = (if (idxData4 >= 0) c.getString(idxData4) else null)?.trim() ?: ""
                        val city = (if (idxData7 >= 0) c.getString(idxData7) else null)?.trim() ?: ""
                        val state = (if (idxData8 >= 0) c.getString(idxData8) else null)?.trim() ?: ""
                        val postcode = (if (idxData9 >= 0) c.getString(idxData9) else null)?.trim() ?: ""
                        val country = (if (idxData10 >= 0) c.getString(idxData10) else null)?.trim() ?: ""
                        if (formatted.isNotEmpty() || street.isNotEmpty() || city.isNotEmpty() || state.isNotEmpty()) {
                            @Suppress("UNCHECKED_CAST")
                            val addresses = entry["addresses"] as MutableList<Map<String, String>>
                            addresses.add(
                                mapOf(
                                    "address" to formatted,
                                    "street" to street,
                                    "city" to city,
                                    "state" to state,
                                    "postalCode" to postcode,
                                    "country" to country
                                )
                            )
                        }
                    }
                    ContactsContract.CommonDataKinds.Email.CONTENT_ITEM_TYPE -> {
                        val email = (if (idxData1 >= 0) c.getString(idxData1) else null)?.trim() ?: ""
                        if (email.isNotEmpty()) {
                            @Suppress("UNCHECKED_CAST")
                            val emails = entry["emails"] as MutableList<Map<String, String>>
                            if (emails.none { it["address"] == email }) {
                                emails.add(mapOf("address" to email, "label" to "Email"))
                            }
                        }
                    }
                    ContactsContract.CommonDataKinds.Organization.CONTENT_ITEM_TYPE -> {
                        val company = (if (idxData1 >= 0) c.getString(idxData1) else null)?.trim() ?: ""
                        val title = (if (idxData4 >= 0) c.getString(idxData4) else null)?.trim() ?: ""
                        if (company.isNotEmpty() || title.isNotEmpty()) {
                            @Suppress("UNCHECKED_CAST")
                            val orgs = entry["organizations"] as MutableList<Map<String, String>>
                            orgs.add(mapOf("company" to company, "title" to title))
                        }
                    }
                    ContactsContract.CommonDataKinds.Note.CONTENT_ITEM_TYPE -> {
                        val note = (if (idxData1 >= 0) c.getString(idxData1) else null)?.trim() ?: ""
                        if (note.isNotEmpty()) {
                            @Suppress("UNCHECKED_CAST")
                            val notes = entry["notes"] as MutableList<String>
                            if (!notes.contains(note)) {
                                notes.add(note)
                            }
                        }
                    }
                }
            }
        }

        return contactsMap.values.toList()
    }

    private fun findRawContactId(contactId: String): Long? {
        val cursor = contentResolver.query(
            ContactsContract.RawContacts.CONTENT_URI,
            arrayOf(ContactsContract.RawContacts._ID),
            "${ContactsContract.RawContacts.CONTACT_ID} = ?",
            arrayOf(contactId),
            null
        )
        cursor?.use {
            if (it.moveToFirst()) {
                return it.getLong(0)
            }
        }
        return null
    }

    private fun hasMimeRow(rawContactId: Long, mimeType: String): Boolean {
        val cursor = contentResolver.query(
            ContactsContract.Data.CONTENT_URI,
            arrayOf(ContactsContract.Data._ID),
            "${ContactsContract.Data.RAW_CONTACT_ID} = ? AND ${ContactsContract.Data.MIMETYPE} = ?",
            arrayOf(rawContactId.toString(), mimeType),
            null
        )
        cursor?.use {
            return it.moveToFirst()
        }
        return false
    }

    private fun updateDeviceContact(
        contactId: String,
        name: String,
        phone: String,
        address: String,
        note: String,
        organization: String
    ): Boolean {
        val rawContactId = findRawContactId(contactId) ?: return false
        val ops = ArrayList<ContentProviderOperation>()

        // 1. Name
        if (name.isNotEmpty()) {
            val mime = ContactsContract.CommonDataKinds.StructuredName.CONTENT_ITEM_TYPE
            if (hasMimeRow(rawContactId, mime)) {
                ops.add(
                    ContentProviderOperation.newUpdate(ContactsContract.Data.CONTENT_URI)
                        .withSelection(
                            "${ContactsContract.Data.RAW_CONTACT_ID} = ? AND ${ContactsContract.Data.MIMETYPE} = ?",
                            arrayOf(rawContactId.toString(), mime)
                        )
                        .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, name)
                        .withValue(ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME, name)
                        .withValue(ContactsContract.CommonDataKinds.StructuredName.FAMILY_NAME, "")
                        .build()
                )
            } else {
                ops.add(
                    ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                        .withValue(ContactsContract.Data.RAW_CONTACT_ID, rawContactId)
                        .withValue(ContactsContract.Data.MIMETYPE, mime)
                        .withValue(ContactsContract.CommonDataKinds.StructuredName.DISPLAY_NAME, name)
                        .withValue(ContactsContract.CommonDataKinds.StructuredName.GIVEN_NAME, name)
                        .build()
                )
            }
        }

        // 2. Phone
        if (phone.isNotEmpty()) {
            val mime = ContactsContract.CommonDataKinds.Phone.CONTENT_ITEM_TYPE
            if (hasMimeRow(rawContactId, mime)) {
                ops.add(
                    ContentProviderOperation.newUpdate(ContactsContract.Data.CONTENT_URI)
                        .withSelection(
                            "${ContactsContract.Data.RAW_CONTACT_ID} = ? AND ${ContactsContract.Data.MIMETYPE} = ?",
                            arrayOf(rawContactId.toString(), mime)
                        )
                        .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, phone)
                        .build()
                )
            } else {
                ops.add(
                    ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                        .withValue(ContactsContract.Data.RAW_CONTACT_ID, rawContactId)
                        .withValue(ContactsContract.Data.MIMETYPE, mime)
                        .withValue(ContactsContract.CommonDataKinds.Phone.NUMBER, phone)
                        .withValue(ContactsContract.CommonDataKinds.Phone.TYPE, ContactsContract.CommonDataKinds.Phone.TYPE_MOBILE)
                        .build()
                )
            }
        }

        // 3. Address / Location
        val postalMime = ContactsContract.CommonDataKinds.StructuredPostal.CONTENT_ITEM_TYPE
        if (hasMimeRow(rawContactId, postalMime)) {
            ops.add(
                ContentProviderOperation.newUpdate(ContactsContract.Data.CONTENT_URI)
                    .withSelection(
                        "${ContactsContract.Data.RAW_CONTACT_ID} = ? AND ${ContactsContract.Data.MIMETYPE} = ?",
                        arrayOf(rawContactId.toString(), postalMime)
                    )
                    .withValue(ContactsContract.CommonDataKinds.StructuredPostal.FORMATTED_ADDRESS, address)
                    .withValue(ContactsContract.CommonDataKinds.StructuredPostal.STREET, address)
                    .build()
            )
        } else if (address.isNotEmpty()) {
            ops.add(
                ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValue(ContactsContract.Data.RAW_CONTACT_ID, rawContactId)
                    .withValue(ContactsContract.Data.MIMETYPE, postalMime)
                    .withValue(ContactsContract.CommonDataKinds.StructuredPostal.FORMATTED_ADDRESS, address)
                    .withValue(ContactsContract.CommonDataKinds.StructuredPostal.STREET, address)
                    .withValue(ContactsContract.CommonDataKinds.StructuredPostal.TYPE, ContactsContract.CommonDataKinds.StructuredPostal.TYPE_HOME)
                    .build()
            )
        }

        // 4. Note
        val noteMime = ContactsContract.CommonDataKinds.Note.CONTENT_ITEM_TYPE
        if (hasMimeRow(rawContactId, noteMime)) {
            ops.add(
                ContentProviderOperation.newUpdate(ContactsContract.Data.CONTENT_URI)
                    .withSelection(
                        "${ContactsContract.Data.RAW_CONTACT_ID} = ? AND ${ContactsContract.Data.MIMETYPE} = ?",
                        arrayOf(rawContactId.toString(), noteMime)
                    )
                    .withValue(ContactsContract.CommonDataKinds.Note.NOTE, note)
                    .build()
            )
        } else if (note.isNotEmpty()) {
            ops.add(
                ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValue(ContactsContract.Data.RAW_CONTACT_ID, rawContactId)
                    .withValue(ContactsContract.Data.MIMETYPE, noteMime)
                    .withValue(ContactsContract.CommonDataKinds.Note.NOTE, note)
                    .build()
            )
        }

        // 5. Organization
        val orgMime = ContactsContract.CommonDataKinds.Organization.CONTENT_ITEM_TYPE
        if (hasMimeRow(rawContactId, orgMime)) {
            ops.add(
                ContentProviderOperation.newUpdate(ContactsContract.Data.CONTENT_URI)
                    .withSelection(
                        "${ContactsContract.Data.RAW_CONTACT_ID} = ? AND ${ContactsContract.Data.MIMETYPE} = ?",
                        arrayOf(rawContactId.toString(), orgMime)
                    )
                    .withValue(ContactsContract.CommonDataKinds.Organization.COMPANY, organization)
                    .build()
            )
        } else if (organization.isNotEmpty()) {
            ops.add(
                ContentProviderOperation.newInsert(ContactsContract.Data.CONTENT_URI)
                    .withValue(ContactsContract.Data.RAW_CONTACT_ID, rawContactId)
                    .withValue(ContactsContract.Data.MIMETYPE, orgMime)
                    .withValue(ContactsContract.CommonDataKinds.Organization.COMPANY, organization)
                    .withValue(ContactsContract.CommonDataKinds.Organization.TYPE, ContactsContract.CommonDataKinds.Organization.TYPE_WORK)
                    .build()
            )
        }

        if (ops.isNotEmpty()) {
            contentResolver.applyBatch(ContactsContract.AUTHORITY, ops)
        }
        return true
    }
}
