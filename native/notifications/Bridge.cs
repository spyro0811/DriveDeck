using System;
using System.IO;
using System.IO.Pipes;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;
using Windows.UI.Notifications;
using Windows.UI.Notifications.Management;
using System.Collections.Generic;
class NotificationBridge : Form {
 readonly Label status=new Label();readonly Button allow=new Button();readonly System.Windows.Forms.Timer timer=new System.Windows.Forms.Timer();
 NamedPipeClientStream pipe;StreamWriter writer;bool busy,closing;Dictionary<uint,string> known=new Dictionary<uint,string>();bool initialized;readonly JavaScriptSerializer json=new JavaScriptSerializer();
 [STAThread]static void Main(string[] args){Application.EnableVisualStyles();Application.SetCompatibleTextRenderingDefault(false);string name=args.Length>0?args[0]:"";if(!System.Text.RegularExpressions.Regex.IsMatch(name,"^drivedeck-notifications-[a-f0-9]{32}$"))return;Application.Run(new NotificationBridge(name));}
 NotificationBridge(string name){Text="DriveDeck notifications";Width=480;Height=240;StartPosition=FormStartPosition.CenterScreen;FormBorderStyle=FormBorderStyle.FixedDialog;MaximizeBox=false;
 status.SetBounds(24,22,410,90);status.Text="Allow DriveDeck to display Windows notifications, including alerts forwarded by Phone Link. Notification content stays on this PC.";allow.SetBounds(24,124,260,42);allow.Text="Allow Windows notification access";Controls.Add(status);Controls.Add(allow);
 allow.Click+=async(s,e)=>{allow.Enabled=false;try{var result=await UserNotificationListener.Current.RequestAccessAsync();if(closing)return;PublishStatus(result.ToString());if(!closing&&result==UserNotificationListenerAccessStatus.Allowed){Hide();timer.Start();}else{status.Text="Notification access was not allowed. You can change this in Windows Settings > Privacy & security > Notifications.";allow.Enabled=true;}}catch(Exception){status.Text="Windows could not grant notification access to this bridge.";PublishStatus("error");allow.Enabled=true;}};
 Shown+=async(s,e)=>{try{pipe=new NamedPipeClientStream(".",name,PipeDirection.Out,PipeOptions.Asynchronous);await pipe.ConnectAsync(10000);if(closing)return;writer=new StreamWriter(pipe,new UTF8Encoding(false)){AutoFlush=true};var access=UserNotificationListener.Current.GetAccessStatus();PublishStatus(access.ToString());if(!closing&&access==UserNotificationListenerAccessStatus.Allowed){Hide();timer.Start();}}catch{Close();}};
 timer.Interval=700;timer.Tick+=async(s,e)=>await Sync();FormClosing+=(s,e)=>Shutdown();FormClosed+=(s,e)=>Shutdown();
 }
 void Shutdown(){if(closing)return;closing=true;timer.Stop();var oldPipe=pipe;var oldWriter=writer;pipe=null;writer=null;try{if(oldPipe!=null)oldPipe.Dispose();}catch(IOException){}try{if(oldWriter!=null)oldWriter.Dispose();}catch(IOException){}catch(ObjectDisposedException){}}
 void Send(object value){if(closing)return;try{if(writer!=null)writer.WriteLine(json.Serialize(value));}catch(IOException){Shutdown();Close();}catch(ObjectDisposedException){Shutdown();Close();}}
 void PublishStatus(string value){Send(new{type="status",status=value.ToLowerInvariant()});}
 readonly Dictionary<string,string> icons=new Dictionary<string,string>();
 async Task<string> ReadIcon(UserNotification notification){try{var id=notification.AppInfo.AppUserModelId;if(icons.ContainsKey(id))return icons[id];using(var source=await notification.AppInfo.DisplayInfo.GetLogo(new Windows.Foundation.Size(48,48)).OpenReadAsync())using(var input=source.AsStreamForRead())using(var picture=System.Drawing.Image.FromStream(input))using(var bitmap=new System.Drawing.Bitmap(picture,48,48))using(var output=new MemoryStream()){bitmap.Save(output,System.Drawing.Imaging.ImageFormat.Png);var bytes=output.ToArray();var result=bytes.Length<=32000?"data:image/png;base64,"+Convert.ToBase64String(bytes):null;if(icons.Count<100)icons[id]=result;return result;}}catch{return null;}}
 async Task Sync(){if(busy||closing)return;busy=true;try{if(UserNotificationListener.Current.GetAccessStatus()!=UserNotificationListenerAccessStatus.Allowed){timer.Stop();PublishStatus("denied");return;}var list=await UserNotificationListener.Current.GetNotificationsAsync(NotificationKinds.Toast);if(closing)return;var current=new Dictionary<uint,string>();foreach(var n in list){try{var binding=n.Notification.Visual.GetBinding(KnownNotificationBindings.ToastGeneric);if(binding==null)continue;var texts=binding.GetTextElements().Select(t=>t.Text).ToArray();var signature=string.Join("\n",texts)+n.CreationTime.ToUnixTimeMilliseconds();current[n.Id]=signature;string previous;if(!initialized||(known.TryGetValue(n.Id,out previous)&&previous==signature))continue;Send(new{type="notification",id=n.Id.ToString(),appId=n.AppInfo.AppUserModelId,appName=n.AppInfo.DisplayInfo.DisplayName,title=texts.FirstOrDefault()??"Notification",body=string.Join("\n",texts.Skip(1)),icon=await ReadIcon(n),createdAt=n.CreationTime.ToUnixTimeMilliseconds()});}catch{}}known=current;initialized=true;PublishStatus("allowed");}catch{PublishStatus("error");}finally{busy=false;}}
}

