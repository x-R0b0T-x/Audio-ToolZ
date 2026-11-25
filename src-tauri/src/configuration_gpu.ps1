Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class AudioToolZGpu {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct Desc {
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst=128)] public string Description;
  public uint VendorId,DeviceId,SubSysId,Revision;
  public UIntPtr DedicatedVideoMemory,DedicatedSystemMemory,SharedSystemMemory;
  public uint LuidLow;public int LuidHigh;public uint Flags;
 }
 [DllImport("dxgi.dll")] static extern int CreateDXGIFactory1(ref Guid iid,out IntPtr factory);
 [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int EnumAdapter(IntPtr self,uint index,out IntPtr adapter);
 [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int GetDesc(IntPtr self,out Desc desc);
 public static object[] Read(){
  var iid=new Guid("770aae78-f26f-4dba-a829-253c83d1b387");IntPtr factory;
  Marshal.ThrowExceptionForHR(CreateDXGIFactory1(ref iid,out factory));var rows=new List<object>();
  try{
   var table=Marshal.ReadIntPtr(factory);
   var enumerate=(EnumAdapter)Marshal.GetDelegateForFunctionPointer(Marshal.ReadIntPtr(table,12*IntPtr.Size),typeof(EnumAdapter));
   for(uint i=0;i<32;i++){
    IntPtr adapter;int hr=enumerate(factory,i,out adapter);
    if(hr==unchecked((int)0x887A0002))break;Marshal.ThrowExceptionForHR(hr);
    try{
     var get=(GetDesc)Marshal.GetDelegateForFunctionPointer(Marshal.ReadIntPtr(Marshal.ReadIntPtr(adapter),10*IntPtr.Size),typeof(GetDesc));Desc d;Marshal.ThrowExceptionForHR(get(adapter,out d));
     if((d.Flags&2)==0)rows.Add(new {Nom=d.Description,MemoireDedieeGo=Math.Round(d.DedicatedVideoMemory.ToUInt64()/1073741824.0,2),MemoirePartageableGo=Math.Round(d.SharedSystemMemory.ToUInt64()/1073741824.0,2)});
    }finally{Marshal.Release(adapter);}
   }
  }finally{Marshal.Release(factory);}return rows.ToArray();
 }
}
'@
@([AudioToolZGpu]::Read()) | ConvertTo-Json -Depth 4 -Compress
