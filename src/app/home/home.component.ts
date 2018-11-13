import { Component, OnInit } from "@angular/core";
import { Observable as RxObservable, of } from "rxjs";
// import { EventData } from "tns-core-modules/ui/page/page";
// import { SetupItemViewArgs } from "nativescript-angular/directives";
import { knownFolders, Folder, File } from "tns-core-modules/file-system";
import * as utils from "tns-core-modules/utils/utils";
import { Page } from "ui/page";
import * as Permissions from "nativescript-permissions";
import * as apps from "tns-core-modules/application";
declare var android: any;
declare var java: any; //java.io.files

@Component({
    selector: "Home",
    moduleId: module.id,
    templateUrl: "./home.component.html"
})
export class HomeComponent implements OnInit {
    public searchValue = "";
    public countries = ["nigeria", "america", "argentina", "brazil"];
    public filtered: RxObservable<String[]>;
    public musicCount = 0;
    public documentCount = 0;
    public imageCount = 0;
    public videosCount = 0;
    public showSearchResult = 'collapsed';
    public showSummary = 'visible';
    public imagesList = [];
    public MediaStore = android.provider.MediaStore;

    constructor(page: Page) {
        // Use the component constructor to inject providers.

        page.actionBarHidden = true;

        Permissions.requestPermission(android.Manifest.permission.READ_EXTERNAL_STORAGE, "Needed To Access Storage").then(() => {
            console.log("Permission granted!");
            let MimeTypeMap = android.webkit.MimeTypeMap;

            const musicPath = this.MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;
            this.musicCount = this.fetchMediaCount(musicPath);

            const documentPath = this.MediaStore.Files.getContentUri("external");
            let selection = "";
            // + this.MediaStore.Files.FileColumns.MEDIA_TYPE_NONE;
            const pdf = MimeTypeMap.getSingleton().getMimeTypeFromExtension("pdf");
            const docx = MimeTypeMap.getSingleton().getMimeTypeFromExtension("docx");
            const xlxs = MimeTypeMap.getSingleton().getMimeTypeFromExtension("xlsx");
            const odt = MimeTypeMap.getSingleton().getMimeTypeFromExtension("odt");
            const txt = MimeTypeMap.getSingleton().getMimeTypeFromExtension("txt");
            const csv = MimeTypeMap.getSingleton().getMimeTypeFromExtension("csv");
            const docMimeTypes = [
                pdf, docx, odt, txt, csv, xlxs
            ];

            docMimeTypes.forEach((element, index) => {
                selection += (element != null && element != "") && index > 0 ? " or " : "";
                selection += element != null && element != "" ? this.MediaStore.Files.FileColumns.MIME_TYPE + "=?" : "";
            });

            this.documentCount = this.fetchMediaCount(documentPath, selection, docMimeTypes);

            const imagePath = this.MediaStore.Images.Media.EXTERNAL_CONTENT_URI;
            this.imageCount = this.fetchMediaCount(imagePath);

            const videoPath = this.MediaStore.Video.Media.EXTERNAL_CONTENT_URI;
            this.videosCount = this.fetchMediaCount(videoPath);

            //---------
            
        }).catch((error) => {
            console.log(error);
        });
    }

    ngOnInit(): void {
        // Init your component properties here.
        // let file = new java.io.File(android.provider.MediaStore.Audio.Media.getContentUri("external").toString());
        // console.log(file.exists());

        // let proj =[ android.provider.MediaStore.Audio.Media._ID, android.provider.MediaStore.Audio.Media.DISPLAY_NAME ];
        // let audioCursor = apps.android.context.getContentResolver().query(android.provider.MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, proj, null, null, null);
    }

    onSubmit(args){
        // console.log(args.object.text);
        this.showSearchResult = "collapsed";
        this.showSummary = "visible";
        let f = [];
        let searchParam = args.object.text;
        if(searchParam !== ""){
            f = this.searchFiles(searchParam);
            this.showSearchResult = "visible";
            this.showSummary = "collapsed";
        } 
        this.filtered = of(f);
        // console.log(downloadPath);
    }

    /**
     * fetchFiles
     */
    public fetchFiles(path: string, arr: Array<Object>, type = "") {
        // const download: Folder = 
        Folder.fromPath(path).getEntities().then(entity => {
            entity.forEach((value) => {
                if (Folder.exists(value.path)) { //is Folder
                    this.fetchFiles(value.path, arr, type);
                } else { //is file
                    console.log(value.name);
                    if (type === "") {
                        arr.push({name: value.name, path: value.path});
                    } else
                    if (type === "music" && (value.name.endsWith(".mp3") || value.name.endsWith(".m4a"))) {
                        arr.push({name: value.name, path: value.path});
                    }
                }
            });
            // console.log("Number of Music Files " + this.musicFiles.length);
        })
        .catch(reason => {
            console.log(reason);
        });
    }

    /**
     * fetchMedia
     */
    public fetchMediaCount(uri, selection = null, selectionArgs = null) {
        let cursor = null;
        let $this = this;
        try {

            var context = apps.android.context;
            let columns = [this.MediaStore.MediaColumns.DATA];
            // let order_by = this.MediaStore.Images.Media._ID;
            // let uri = this.MediaStore.Images.Media.EXTERNAL_CONTENT_URI;

            cursor = context.getContentResolver().query(uri, columns, selection, selectionArgs, null);
            let num = 0;

            if (cursor && cursor.getCount() > 0 && cursor.moveToFirst()) {
                num += cursor.getCount();
                console.log(num);
            } else {
                console.log("Count is Zero");
            }

            cursor.close();
            return num;
        } catch (error) { 
            console.log(error); 
        }
    }

    /**
     * searchFiles
     */
    public searchFiles(query: String): Array<Object> {
        let cursor = null;
        let $this = this;
        try {

            var context = apps.android.context;
            let columns = [
                this.MediaStore.MediaColumns._ID, 
                this.MediaStore.Files.FileColumns.TITLE, 
                this.MediaStore.MediaColumns.DATA, 
                this.MediaStore.Files.FileColumns.MEDIA_TYPE, 
                this.MediaStore.Files.FileColumns.MIME_TYPE
            ];
            let selection = this.MediaStore.Files.FileColumns.TITLE + " like '%"+query+"%' and " + this.MediaStore.Files.FileColumns.MIME_TYPE + " is not null and " + 
            this.MediaStore.Files.FileColumns.DISPLAY_NAME + " is not null";
            let selectionArgs = null;
            // let order_by = this.MediaStore.Images.Media._ID;
            let uri = this.MediaStore.Files.getContentUri("external");

            cursor = context.getContentResolver().query(uri, columns, selection, selectionArgs, null);
            let num = 0;
            let file = [];

            if (cursor && cursor.getCount() > 0 && cursor.moveToFirst()) {
                while (cursor.moveToNext()) {
                    if(num <= 30) {
                        let name_index = cursor.getColumnIndex(this.MediaStore.Files.FileColumns.TITLE) ;
                        let name = cursor.getString(name_index) + '';
                        let path_index = cursor.getColumnIndex(this.MediaStore.MediaColumns.DATA) ;
                        let path = cursor.getString(path_index) + '';
                        let type_index = cursor.getColumnIndex(this.MediaStore.Files.FileColumns.MEDIA_TYPE) ;
                        let type = cursor.getString(type_index) + '';
                        let type_mime = cursor.getColumnIndex(this.MediaStore.Files.FileColumns.MIME_TYPE) ;
                        let mime = cursor.getString(type_mime) + '';
                        // let name = imageUri.substring(imageUri.lastIndexOf('.'));

                        file.push({name: name, path: path, type: type, mime: mime});
                        // $this.imagesList.push(image);
                    }
                    num++
                }
            } else {
                console.log("Count is Zero");
            }

            cursor.close();
            return file;
        } catch (error) { 
            console.log(error); 
        }
    }

    /**
     * chooseFile
     */
    public chooseFile(media) {
        // console.log(media.path);
        var file = new java.io.File(media.path);
        const context = apps.android.currentContext;
        //utils.ad.getApplicationContext();
        // console.log(file.isFile());
        // console.log(file.isDirectory());
        // console.log(android.net.Uri.fromFile(file));
        console.log(context.getApplicationContext().getPackageName() + ".fileprovider");

        let intent = new android.content.Intent(android.content.Intent.ACTION_VIEW);
        // Set the file content URI using Android native APIs
        intent.setDataAndType(android.support.v4.content.FileProvider.getUriForFile(context, context.getApplicationContext().getPackageName() + ".fileprovider", new java.io.File(media.path)), media.mime);

        // Grant permission for third party apps to read the content of this file
        intent.setFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION);
        context.startActivity(android.content.Intent.createChooser(intent, "Open File..."));
        // intent.setDataAndTypeAndNormalize(android.net.Uri.fromFile(file), media.mime);
        
        // context.startActivity(android.content.Intent.createChooser(intent, "Open File..."));
        // apps.android.currentContext.startActivity(intent);
        // android.app.Activity.startActivity(intent);
        
        // console.log(File.fromPath(media.path).extension);
    }

    /**
     * getHex
     */
    public getHex(type: number): Object {
        let hex = 0xe24d;
        let cssclass = "txt-green-primary";
        if (type == this.MediaStore.Files.FileColumns.MEDIA_TYPE_AUDIO) {
            hex = 0xe03d;
            cssclass = "txt-red-primary";
        } else if(type == this.MediaStore.Files.FileColumns.MEDIA_TYPE_VIDEO) {
            hex = 0xe54d;
            cssclass = "txt-purple-primary";
        } else if(type == this.MediaStore.Files.FileColumns.MEDIA_TYPE_IMAGE) {
            hex = 0xe251;
            cssclass = "txt-blue-primary";
        }
        return {hex: String.fromCharCode(hex), class: cssclass };
    }
    
}
