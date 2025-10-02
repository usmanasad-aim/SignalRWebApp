"use client"

import { useState, useEffect, useRef } from "react"
import { type HubConnection, HubConnectionBuilder, LogLevel } from "@microsoft/signalr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, CheckCircle, XCircle, Wifi, WifiOff } from "lucide-react"

interface StatusSummary {
  Online: number
  Offline: number
  Warning: number
  InProduction: number
  Error: number
  Other: number
  Idle: number
  MachineAlarm: number
  OperationStop: number
  Active: number
  PalletChange: number
  Running: number
  InCycle: number
  Emergency: number
  Available: number
  Inactive: number
}

interface MachineLog {
  id: string
  machineId: string
  customerId: string
  name: string
  userId: string
  color: string
  status: string
  statusSummary?: StatusSummary
  timestamp?: string
}

export default function SignalRClient() {
  const [connection, setConnection] = useState<HubConnection | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [userId, setUserId] = useState("")
  const [serverUrl, setServerUrl] = useState("https://mms-api-fbabadckhjdybmg7.westus2-01.azurewebsites.net/machineHub")
  const [logs, setLogs] = useState<MachineLog[]>([])
  const [connectionStatus, setConnectionStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected")
  const connectionRef = useRef<HubConnection | null>(null)

  const connectToHub = async () => {
    if (!userId.trim()) {
      alert("Please enter a valid User ID")
      return
    }

    try {
      setConnectionStatus("connecting")

      // Create new connection
      const newConnection = new HubConnectionBuilder()
        .withUrl(`${serverUrl}?user_id=${userId}`, {
          withCredentials: false, // Set to true if you need credentials
        })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Information)
        .build()

      // Set up event handlers
      newConnection.on("ReceiveMachineUpdate", (response: any) => {
        console.log("🔄 Received machine update:", response)
        if (response && response.data) {
          const log: MachineLog = {
            ...response.data,
            timestamp: new Date().toISOString()
          }
          setLogs((prevLogs) => [log, ...prevLogs.slice(0, 49)]) // Keep last 50 logs
        }
      })

      // Connection state handlers
      newConnection.onclose((error) => {
        console.log("❌ Connection closed:", error)
        setIsConnected(false)
        setConnectionStatus("disconnected")
      })

      newConnection.onreconnecting((error) => {
        console.log("🔄 Reconnecting:", error)
        setConnectionStatus("connecting")
      })

      newConnection.onreconnected((connectionId) => {
        console.log("✅ Reconnected:", connectionId)
        setIsConnected(true)
        setConnectionStatus("connected")
      })

      // Start the connection
      await newConnection.start()

      console.log("🟢 Connected to SignalR hub")
      setConnection(newConnection)
      connectionRef.current = newConnection
      setIsConnected(true)
      setConnectionStatus("connected")
    } catch (error) {
      console.error("❌ Error connecting to SignalR hub:", error)
      setConnectionStatus("disconnected")
      alert("Failed to connect to SignalR hub. Please check the server URL and try again.")
    }
  }

  const disconnectFromHub = async () => {
    if (connectionRef.current) {
      try {
        await connectionRef.current.stop()
        console.log("🔴 Disconnected from SignalR hub")
      } catch (error) {
        console.error("❌ Error disconnecting:", error)
      } finally {
        setConnection(null)
        connectionRef.current = null
        setIsConnected(false)
        setConnectionStatus("disconnected")
      }
    }
  }

  const clearLogs = () => {
    setLogs([])
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        connectionRef.current.stop()
      }
    }
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "success":
      case "online":
      case "running":
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
      case "failed":
      case "offline":
      case "emergency":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
      case "idle":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "success":
      case "online":
      case "running":
      case "active":
        return "bg-green-100 text-green-800"
      case "error":
      case "failed":
      case "offline":
      case "emergency":
        return "bg-red-100 text-red-800"
      case "processing":
      case "warning":
      case "inproduction":
        return "bg-blue-100 text-blue-800"
      case "idle":
        return "bg-yellow-100 text-yellow-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        {/* Connection Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {connectionStatus === "connected" ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : (
                <WifiOff className="h-5 w-5 text-gray-500" />
              )}
              SignalR Machine Hub Client
            </CardTitle>
            <CardDescription>Connect to the SignalR hub to receive real-time machine updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Server URL</label>
                <Input
                  type="text"
                  placeholder="https://mms-api-fbabadckhjdybmg7.westus2-01.azurewebsites.net/machineHub"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  disabled={isConnected}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">User ID</label>
                <Input
                  type="text"
                  placeholder="Enter user ID (GUID)"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  disabled={isConnected}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge
                variant={connectionStatus === "connected" ? "default" : "secondary"}
                className={connectionStatus === "connected" ? "bg-green-500" : ""}
              >
                {connectionStatus === "connected" && "🟢 "}
                {connectionStatus === "connecting" && "🟡 "}
                {connectionStatus === "disconnected" && "🔴 "}
                {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
              </Badge>

              {!isConnected ? (
                <Button onClick={connectToHub} disabled={connectionStatus === "connecting"}>
                  {connectionStatus === "connecting" ? "Connecting..." : "Connect"}
                </Button>
              ) : (
                <Button variant="outline" onClick={disconnectFromHub}>
                  Disconnect
                </Button>
              )}

              {logs.length > 0 && (
                <Button variant="outline" onClick={clearLogs}>
                  Clear Logs
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Logs Panel */}
        <Card>
          <CardHeader>
            <CardTitle>Machine Updates ({logs.length})</CardTitle>
            <CardDescription>Real-time machine updates received from the SignalR hub</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] w-full">
              {logs.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No machine updates received yet. Connect to start receiving updates.
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log, index) => (
                    <div key={`${log.id}-${index}`} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <Badge className={getStatusColor(log.status)}>{log.status}</Badge>
                          <span className="text-sm text-muted-foreground">Machine: {log.machineId}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {log.timestamp ? new Date(log.timestamp).toLocaleString() : ""}
                        </span>
                      </div>

                      <div className="mt-2 space-y-1">
                        <p className="text-sm font-medium">{log.name}</p>
                        <div className="text-xs text-muted-foreground">
                          Customer: {log.customerId} | User: {log.userId} | Log ID: {log.id}
                        </div>
                        {log.color && (
                          <div className="text-xs text-muted-foreground">Color: {log.color}</div>
                        )}
                        {log.statusSummary && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Status Summary
                            </summary>
                            <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                              {JSON.stringify(log.statusSummary, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}