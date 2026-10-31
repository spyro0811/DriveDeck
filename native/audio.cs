using System;
using System.Runtime.InteropServices;
using System.Threading;
using System.Globalization;
namespace DriveDeckAudio {
 [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class Enumerator {}
 [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IDevices {
  [PreserveSig] int EnumAudioEndpoints(int flow,uint mask,out IntPtr devices);
  [PreserveSig] int GetDefaultAudioEndpoint(int flow,int role,out IDevice device);
 }
 [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IDevice {
  [PreserveSig] int Activate(ref Guid iid,uint context,IntPtr parameters,[MarshalAs(UnmanagedType.IUnknown)] out object result);
 }
 [ComImport, Guid("1CB9AD4C-DBFA-4C32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IClient {
  [PreserveSig] int Initialize(int mode,uint flags,long duration,long period,IntPtr format,ref Guid session);
  [PreserveSig] int GetBufferSize(out uint frames);
  [PreserveSig] int GetStreamLatency(out long latency);
  [PreserveSig] int GetCurrentPadding(out uint frames);
  [PreserveSig] int IsFormatSupported(int mode,IntPtr format,out IntPtr closest);
  [PreserveSig] int GetMixFormat(out IntPtr format);
  [PreserveSig] int GetDevicePeriod(out long normal,out long minimum);
  [PreserveSig] int Start();
  [PreserveSig] int Stop();
  [PreserveSig] int Reset();
  [PreserveSig] int SetEventHandle(IntPtr handle);
  [PreserveSig] int GetService(ref Guid iid,[MarshalAs(UnmanagedType.IUnknown)] out object service);
 }
 [ComImport, Guid("C8ADBD64-E71E-48A0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IPackets {
  [PreserveSig] int GetBuffer(out IntPtr data,out uint frames,out uint flags,out ulong position,out ulong time);
  [PreserveSig] int ReleaseBuffer(uint frames);
  [PreserveSig] int GetNextPacketSize(out uint frames);
 }
 public static class Capture {
  const int N=2048;
  static void Check(int hr) { Marshal.ThrowExceptionForHR(hr); }
  public static double[] Spectrum(double[] samples,int rate) {
   double[] re=new double[N],im=new double[N],bands=new double[32];
   for(int i=0;i<N;i++) re[i]=samples[i]*(.5-.5*Math.Cos(2*Math.PI*i/(N-1)));
   for(int i=1,j=0;i<N;i++){int bit=N>>1;for(;(j&bit)!=0;bit>>=1)j^=bit;j^=bit;if(i<j){double t=re[i];re[i]=re[j];re[j]=t;}}
   for(int len=2;len<=N;len<<=1){double angle=-2*Math.PI/len;for(int start=0;start<N;start+=len){for(int k=0;k<len/2;k++){double c=Math.Cos(angle*k),s=Math.Sin(angle*k);int a=start+k,b=a+len/2;double x=re[b]*c-im[b]*s,y=re[b]*s+im[b]*c;re[b]=re[a]-x;im[b]=im[a]-y;re[a]+=x;im[a]+=y;}}}
   double top=Math.Min(16000,rate*.48);
   for(int b=0;b<32;b++){int lo=Math.Max(1,(int)(40*Math.Pow(top/40,b/32.0)*N/rate)),hi=Math.Min(N/2,(int)Math.Ceiling(40*Math.Pow(top/40,(b+1)/32.0)*N/rate));double magnitude=0;
    for(int k=lo;k<=hi;k++)magnitude=Math.Max(magnitude,Math.Sqrt(re[k]*re[k]+im[k]*im[k])*4/N);
    bands[b]=Math.Max(0,Math.Min(1,(20*Math.Log10(Math.Max(1e-12,magnitude))+72)/66));
   }return bands;
  }
  public static void Run() {
   IDevices devices=(IDevices)new Enumerator();IDevice device;Check(devices.GetDefaultAudioEndpoint(0,1,out device));
   Guid clientId=typeof(IClient).GUID;object obj;Check(device.Activate(ref clientId,23,IntPtr.Zero,out obj));IClient client=(IClient)obj;
   IntPtr format;Check(client.GetMixFormat(out format));int tag=Marshal.ReadInt16(format,0)&65535,channels=Marshal.ReadInt16(format,2),rate=Marshal.ReadInt32(format,4),align=Marshal.ReadInt16(format,12),bits=Marshal.ReadInt16(format,14);
   if(tag==65534)tag=Marshal.ReadInt32(format,24);
   if(!((tag==3&&bits==32)||(tag==1&&(bits==16||bits==24||bits==32))))throw new Exception("Unsupported output audio format.");
   Guid session=Guid.Empty;Check(client.Initialize(0,0x20000,1000000,0,format,ref session));Marshal.FreeCoTaskMem(format);
   Guid packetId=typeof(IPackets).GUID;Check(client.GetService(ref packetId,out obj));IPackets packets=(IPackets)obj;
   Check(client.Start());double[] ring=new double[N],ordered=new double[N];int cursor=0;DateTime last=DateTime.UtcNow,next=DateTime.MinValue;
   while(true){uint count;Check(packets.GetNextPacketSize(out count));while(count>0){IntPtr data;uint frames,flags;ulong pos,time;Check(packets.GetBuffer(out data,out frames,out flags,out pos,out time));
    try{int length=checked((int)frames*align);if(length>16*1024*1024)throw new Exception("Audio packet too large.");byte[] bytes=new byte[length];if((flags&2)==0)Marshal.Copy(data,bytes,0,length);
     for(int f=0;f<frames;f++){double sample=0;for(int c=0;c<channels;c++){int offset=f*align+c*(bits/8);double v=0;if(tag==3)v=BitConverter.ToSingle(bytes,offset);else if(bits==16)v=BitConverter.ToInt16(bytes,offset)/32768.0;else if(bits==32)v=BitConverter.ToInt32(bytes,offset)/2147483648.0;else{int n=bytes[offset]|bytes[offset+1]<<8|bytes[offset+2]<<16;if((n&0x800000)!=0)n|=unchecked((int)0xff000000);v=n/8388608.0;}if(!Double.IsNaN(v)&&!Double.IsInfinity(v))sample+=v/channels;}ring[cursor]=sample;cursor=(cursor+1)%N;}last=DateTime.UtcNow;
    }finally{Check(packets.ReleaseBuffer(frames));}Check(packets.GetNextPacketSize(out count));}
    DateTime now=DateTime.UtcNow;if(now>=next){if((now-last).TotalMilliseconds>200)Array.Clear(ring,0,N);for(int i=0;i<N;i++)ordered[i]=ring[(cursor+i)%N];double[] bands=Spectrum(ordered,rate);string[] values=new string[32];for(int i=0;i<32;i++)values[i]=bands[i].ToString("F4",CultureInfo.InvariantCulture);Console.WriteLine("{\"bands\":["+String.Join(",",values)+"]}");next=now.AddMilliseconds(40);}Thread.Sleep(8);
   }
  }
 }
}
